import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PDFQualityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
}

const PDFQualityDialog = ({ isOpen, onClose, fileName }: PDFQualityDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            📄 Scanned PDF Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4">
            <p>
              <strong>{fileName}</strong> appears to be a scanned document or has low-quality text extraction. 
              We're using OCR (Optical Character Recognition) to process it, which may take longer.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <p className="font-semibold text-foreground">💡 Tips for better results:</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <strong>Use high-resolution scans:</strong> Scan at 300 DPI or higher for clearer text recognition
                </li>
                <li>
                  <strong>Ensure good contrast:</strong> Black text on white background works best
                </li>
                <li>
                  <strong>Avoid skewed pages:</strong> Keep documents straight when scanning
                </li>
                <li>
                  <strong>Use native PDFs when possible:</strong> PDFs created directly from digital documents (not scanned) 
                  process faster and more accurately
                </li>
                <li>
                  <strong>Clean the original:</strong> Remove coffee stains, pen marks, or other artifacts before scanning
                </li>
                <li>
                  <strong>Break up large files:</strong> Split very large PDFs into smaller sections for faster processing
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              OCR processing will continue in the background. You can check the progress in the upload status.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>
            Got it, continue processing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PDFQualityDialog;