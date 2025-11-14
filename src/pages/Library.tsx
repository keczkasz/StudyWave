import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LibraryCard from "@/components/LibraryCard";

const Library = () => {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [audiobooks, setAudiobooks] = useState<any[]>([]);

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
    if (type === "pdf") {
      await supabase.from("pdf_documents").delete().eq("id", id);
      loadPDFs((await supabase.auth.getSession()).data.session!.user.id);
    } else {
      await supabase.from("audio_files").delete().eq("id", id);
      loadAudiobooks((await supabase.auth.getSession()).data.session!.user.id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Library</h1>

        <Tabs defaultValue="audiobooks" className="w-full">
          <TabsList>
            <TabsTrigger value="audiobooks">Audiobooks</TabsTrigger>
            <TabsTrigger value="pdfs">PDFs</TabsTrigger>
          </TabsList>

          <TabsContent value="audiobooks" className="mt-6">
            {audiobooks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No audiobooks yet. Upload a PDF to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {audiobooks.map((audio) => (
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
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pdfs" className="mt-6">
            {pdfs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No PDFs yet. Upload one to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pdfs.map((pdf) => (
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
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Library;
