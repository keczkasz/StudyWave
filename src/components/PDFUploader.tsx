import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import PDFQualityDialog from "@/components/PDFQualityDialog";

const PDFUploader = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrProgress, setOcrProgress] = useState<{
    fileName: string;
    current: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [currentFileName, setCurrentFileName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a PDF file`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB size limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      const selectedFiles = Array.from(e.target.files).filter((file) => {
        if (file.type !== "application/pdf") {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a PDF file`,
            variant: "destructive",
          });
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 50MB size limit`,
            variant: "destructive",
          });
          return false;
        }
        return true;
      });
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let pdfDocId: string | null = null;
        
        try {
          // Upload file to storage first
          const fileExt = file.name.split(".").pop();
          const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("pdf-uploads")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Create PDF document record with "processing" status
          const { data: pdfDoc, error: dbError } = await supabase
            .from("pdf_documents")
            .insert({
              user_id: session.user.id,
              title: file.name.replace(".pdf", ""),
              original_filename: file.name,
              file_path: fileName,
              file_size: file.size,
              status: "processing",
            })
            .select()
            .single();

          if (dbError) throw dbError;
          pdfDocId = pdfDoc.id;

          // Extract text from PDF with timeout
          toast({
            title: "Processing PDF",
            description: `Analyzing ${file.name}...`,
          });

          const { extractTextFromPDF, estimateReadingTime } = await import("@/services/pdfService");
          const { needsOCR, processPDFWithOCR } = await import("@/services/ocrService");
          
          // Add timeout for text extraction (10 minutes)
          const textExtractionTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Text extraction timeout - PDF may be too large")), 600000);
          });
          
          let extractedText = await Promise.race([
            extractTextFromPDF(file, (msg) => {
              toast({
                title: "Processing PDF",
                description: msg,
              });
            }),
            textExtractionTimeout
          ]);

          // Check if OCR is needed
          if (needsOCR(extractedText)) {
            // Show quality dialog for the first OCR file
            setCurrentFileName(file.name);
            setShowQualityDialog(true);
            
            toast({
              title: "Scanned PDF detected",
              description: "Using OCR to extract text...",
            });

            // Longer timeout for OCR (20 minutes)
            const ocrTimeout = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("OCR timeout - PDF has too many pages or images are too complex")), 1200000);
            });

            extractedText = await Promise.race([
              processPDFWithOCR(file, (ocrProgressData) => {
                const percentage = Math.round((ocrProgressData.page / ocrProgressData.totalPages) * 100);
                setOcrProgress({
                  fileName: file.name,
                  current: ocrProgressData.page,
                  total: ocrProgressData.totalPages,
                  percentage,
                });
                toast({
                  title: "OCR Processing",
                  description: `Scanning page ${ocrProgressData.page} of ${ocrProgressData.totalPages} (${percentage}%)`,
                });
              }),
              ocrTimeout
            ]);
            setOcrProgress(null);
          }

          const duration = estimateReadingTime(extractedText);

          // Create audio file record with extracted text
          await supabase.from("audio_files").insert({
            pdf_id: pdfDoc.id,
            user_id: session.user.id,
            extracted_text: extractedText,
            duration_seconds: duration,
          });

          // Update PDF status to completed
          await supabase
            .from("pdf_documents")
            .update({ status: "completed" })
            .eq("id", pdfDoc.id);

          setProgress(((i + 1) / files.length) * 100);
        } catch (fileError: any) {
          console.error(`Error processing ${file.name}:`, fileError);
          
          // Always update PDF status to failed if we have a doc ID
          if (pdfDocId) {
            try {
              await supabase
                .from("pdf_documents")
                .update({
                  status: "failed",
                  error_message: fileError.message || "Failed to process PDF",
                })
                .eq("id", pdfDocId);
            } catch (dbError) {
              console.error("Failed to update database status:", dbError);
            }
          }

          // Show specific error messages
          let errorMessage = fileError.message;
          if (fileError.message?.includes("timeout")) {
            errorMessage = "Processing timeout - PDF may be too large or corrupted. Please try a smaller file.";
          } else if (fileError.message?.includes("OCR")) {
            errorMessage = "OCR processing failed - the PDF may have poor image quality.";
          } else if (fileError.message?.includes("worker")) {
            errorMessage = "Failed to initialize PDF reader. Please try again.";
          }

          toast({
            title: `Failed to process ${file.name}`,
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        // Clear OCR progress after each file
        setOcrProgress(null);
      }

      toast({
        title: "Upload complete!",
        description: "Your PDFs are ready to listen.",
      });

      navigate("/library");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setFiles([]);
    }
  };

  return (
    <div className="space-y-6">
      <PDFQualityDialog
        isOpen={showQualityDialog}
        onClose={() => setShowQualityDialog(false)}
        fileName={currentFileName}
      />
      
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            Drop PDF files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Support for PDFs up to 50MB
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Selected Files ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Upload Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {ocrProgress && (
            <div className="space-y-2 p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex justify-between text-sm font-medium">
                <span className="truncate max-w-[200px]">{ocrProgress.fileName}</span>
                <span>{ocrProgress.percentage}%</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>OCR Scanning</span>
                <span>Page {ocrProgress.current} of {ocrProgress.total}</span>
              </div>
              <Progress value={ocrProgress.percentage} className="w-full" />
            </div>
          )}

          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? "Processing..." : `Upload ${files.length} file(s)`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
