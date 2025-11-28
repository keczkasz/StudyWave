import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LibraryCard from "@/components/LibraryCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

const Library = () => {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [audiobooks, setAudiobooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadPDFs(session.user.id);
        loadAudiobooks(session.user.id);
      }
    });
  }, [navigate]);

  const loadPDFs = async (userId: string) => {
    const { data } = await supabase
      .from("pdf_documents")
      .select("*")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false });

    setPdfs(data || []);
  };

  const loadAudiobooks = async (userId: string) => {
    const { data } = await supabase
      .from("audio_files")
      .select("*, pdf_documents(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setAudiobooks(data || []);
  };

  const handleDelete = async (id: string, type: "pdf" | "audio") => {
    const tableName = type === "pdf" ? "pdf_documents" : "audio_files";
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted successfully");
      type === "pdf" ? loadPDFs((await supabase.auth.getUser()).data.user?.id!) : loadAudiobooks((await supabase.auth.getUser()).data.user?.id!);
    }
  };

  const filteredAudiobooks = audiobooks.filter(audiobook =>
    audiobook.pdf_documents?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPdfs = pdfs.filter(pdf =>
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">My Library</h1>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Tabs defaultValue="audiobooks" className="w-full">
          <TabsList>
            <TabsTrigger value="audiobooks">Audiobooks</TabsTrigger>
            <TabsTrigger value="pdfs">PDFs</TabsTrigger>
          </TabsList>

          <TabsContent value="audiobooks" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredAudiobooks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 col-span-full">
                  {searchQuery ? "No audiobooks found matching your search." : "No audiobooks yet. Upload a PDF to get started!"}
                </p>
              ) : (
                filteredAudiobooks.map((audio) => (
                  <LibraryCard
                    key={audio.id}
                    item={{
                      id: audio.id,
                      title: audio.pdf_documents?.title || "Untitled",
                      type: "audio",
                      duration: audio.duration_seconds,
                      lastPosition: audio.last_position_seconds,
                      createdAt: audio.created_at,
                    }}
                    onDelete={() => handleDelete(audio.id, "audio")}
                    onPlay={() => navigate(`/player/${audio.id}`)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="pdfs" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredPdfs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 col-span-full">
                  {searchQuery ? "No PDFs found matching your search." : "No PDFs uploaded yet."}
                </p>
              ) : (
                filteredPdfs.map((pdf) => (
                  <LibraryCard
                    key={pdf.id}
                    item={{
                      id: pdf.id,
                      title: pdf.title,
                      type: "pdf",
                      status: pdf.status,
                      fileSize: pdf.file_size,
                      uploadDate: pdf.upload_date,
                    }}
                    onDelete={() => handleDelete(pdf.id, "pdf")}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Library;
