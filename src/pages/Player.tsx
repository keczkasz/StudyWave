import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import AudioPlayer from "@/components/AudioPlayer";
import SurfGame from "@/components/SurfGame";
import { Headphones, Gamepad2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AudioData {
  id: string;
  file_path: string;
  voice_id: string;
  created_at: string;
  pdf_documents?: {
    title: string;
    original_filename: string;
  };
}

const Player = () => {
  const { audioId } = useParams();
  const navigate = useNavigate();
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameOpen, setGameOpen] = useState(false);

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
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
          {/* Header - Compact on mobile */}
          <div className="text-center mb-4 sm:mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary to-accent mb-3 sm:mb-6">
              <Headphones className="h-10 w-10 sm:h-16 sm:w-16 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 px-2">
              {audioData.pdf_documents?.title || "Untitled"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground px-2 truncate">
              {audioData.pdf_documents?.original_filename}
            </p>
          </div>

          {/* Audio Player */}
          <div className="mb-4 sm:mb-6">
            <AudioPlayer audioData={audioData} />
          </div>

          {/* Game Section */}
          <Collapsible open={gameOpen} onOpenChange={setGameOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex items-center justify-between gap-2 py-4 sm:py-6 border-dashed hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500">
                    <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm sm:text-base">🏄 Surf Runner</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      Play while you listen - avoid rocks and seagulls!
                    </p>
                  </div>
                </div>
                {gameOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 sm:mt-4">
              <SurfGame />
            </CollapsibleContent>
          </Collapsible>

          {/* Game tip for mobile */}
          <p className="text-center text-xs text-muted-foreground mt-4 px-4 sm:hidden">
            Tip: Play the game while your audiobook reads to you!
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Player;
