import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import AudioPlayer from "@/components/AudioPlayer";
import { Headphones } from "lucide-react";

const Player = () => {
  const { audioId } = useParams();
  const navigate = useNavigate();
  const [audioData, setAudioData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      if (audioId) {
        const { data, error } = await supabase
          .from("audio_files")
          .select("*, pdf_documents(*)")
          .eq("id", audioId)
          .single();

        if (error || !data) {
          navigate("/library");
          return;
        }

        setAudioData(data);
      }
      setLoading(false);
    };

    checkAuthAndLoad();
  }, [audioId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!audioData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent mb-6">
            <Headphones className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {audioData.pdf_documents?.title || "Untitled"}
          </h1>
          <p className="text-muted-foreground">
            {audioData.pdf_documents?.original_filename}
          </p>
        </div>

        <AudioPlayer audioData={audioData} />
      </div>
    </div>
  );
};

export default Player;
