import { memo, useMemo } from "react";
import { FileText, Headphones, Play, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LibraryCardProps {
  item: {
    id: string;
    title: string;
    type: "pdf" | "audio";
    status?: string;
    fileSize?: number;
    uploadDate?: string;
    duration?: number;
    lastPosition?: number;
    createdAt?: string;
  };
  onDelete: () => void;
  onPlay?: () => void;
}

// Utility functions moved outside component to prevent recreation
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatFileSize = (bytes: number) => {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const getStatusClasses = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "processing":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Memoize the component to prevent unnecessary re-renders in lists
const LibraryCard = memo(({ item, onDelete, onPlay }: LibraryCardProps) => {
  // Memoize formatted values
  const formattedFileSize = useMemo(
    () => item.fileSize && formatFileSize(item.fileSize),
    [item.fileSize]
  );
  
  const formattedUploadDate = useMemo(
    () => item.uploadDate && new Date(item.uploadDate).toLocaleDateString(),
    [item.uploadDate]
  );
  
  const formattedDuration = useMemo(
    () => item.duration && formatDuration(item.duration),
    [item.duration]
  );
  
  const formattedLastPosition = useMemo(
    () => item.lastPosition && formatDuration(item.lastPosition),
    [item.lastPosition]
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          {item.type === "pdf" ? (
            <FileText className="h-12 w-12 text-primary" />
          ) : (
            <Headphones className="h-12 w-12 text-accent" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{item.title}</h3>

        {item.type === "pdf" && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Size: {formattedFileSize}</p>
            <p>Uploaded: {formattedUploadDate}</p>
            {item.status && (
              <span
                className={`inline-block px-2 py-1 rounded text-xs ${getStatusClasses(item.status)}`}
              >
                {item.status}
              </span>
            )}
          </div>
        )}

        {item.type === "audio" && (
          <>
            <div className="space-y-1 text-sm text-muted-foreground mb-4">
              <p>Duration: {formattedDuration}</p>
              <p>Progress: {formattedLastPosition}</p>
            </div>
            {onPlay && (
              <Button onClick={onPlay} className="w-full gap-2">
                <Play className="h-4 w-4" />
                Play
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

LibraryCard.displayName = "LibraryCard";

export default LibraryCard;
