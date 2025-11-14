import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const PDFUploader = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );
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

          // Extract text from PDF
          toast({
            title: "Processing PDF",
            description: `Analyzing ${file.name}...`,
          });

          const { extractTextFromPDF, estimateReadingTime } = await import("@/services/pdfService");
          const { needsOCR, processPDFWithOCR } = await import("@/services/ocrService");
          
          let extractedText = await extractTextFromPDF(file, (msg) => {
            toast({
              title: "Processing PDF",
              description: msg,
            });
          });

          // Check if OCR is needed
          if (needsOCR(extractedText)) {
            toast({
              title: "Scanned PDF detected",
              description: "Using OCR to extract text...",
            });

            extractedText = await processPDFWithOCR(file, (progress) => {
              toast({
                title: "OCR Processing",
                description: progress.status,
              });
            });
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
          
          // Update PDF status to failed if we have a doc ID
          if (pdfDocId) {
            await supabase
              .from("pdf_documents")
              .update({
                status: "failed",
                error_message: fileError.message || "Failed to process PDF",
              })
              .eq("id", pdfDocId);
          }

          toast({
            title: `Failed to process ${file.name}`,
            description: fileError.message,
            variant: "destructive",
          });
        }
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

          {uploading && <Progress value={progress} className="w-full" />}

          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
