import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import SurfGame from "@/components/SurfGame";
import SurfRunner2 from "@/components/SurfRunner2";
import { Trophy, Waves, Info, Gamepad2, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Game = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<"surf1" | "surf2">("surf1");
  const [highScores, setHighScores] = useState({
    surf1: parseInt(localStorage.getItem("surfGameHighScore") || "0"),
    surf2: parseInt(localStorage.getItem("surfRunner2HighScore") || "0"),
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for high score updates
    const interval = setInterval(() => {
      setHighScores({
        surf1: parseInt(localStorage.getItem("surfGameHighScore") || "0"),
        surf2: parseInt(localStorage.getItem("surfRunner2HighScore") || "0"),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#9a8faf] via-[#b4a9c7] to-[#c8c0d5] mb-3 sm:mb-4 relative shadow-lg">
            <Gamepad2 className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 sm:p-2 shadow-md">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-800" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-[#9a8faf] via-[#b4a9c7] to-[#c8c0d5] bg-clip-text text-transparent">
            🏄 Surf Games
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4">
            Relaxing surf games - perfect for listening to audiobooks!
          </p>
        </div>

        {/* Game Selection Tabs */}
        <Tabs value={selectedGame} onValueChange={(v) => setSelectedGame(v as "surf1" | "surf2")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1 bg-muted/50">
            <TabsTrigger 
              value="surf1" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#9a8faf] data-[state=active]:to-[#b4a9c7] data-[state=active]:text-white"
            >
              <Waves className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-semibold">Surf Runner</span>
              {highScores.surf1 > 0 && (
                <span className="text-[10px] sm:text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                  {highScores.surf1}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="surf2"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#9a8faf] data-[state=active]:to-[#b4a9c7] data-[state=active]:text-white"
            >
              <ArrowRight className="h-4 w-4 rotate-[-90deg]" />
              <span className="text-xs sm:text-sm font-semibold">Surf Runner 2</span>
              {highScores.surf2 > 0 && (
                <span className="text-[10px] sm:text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                  {highScores.surf2}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Game 1: Surf Runner (Horizontal endless runner) */}
          <TabsContent value="surf1" className="mt-0">
            <div className="space-y-4">
              {/* Game Info Card */}
              <div className="bg-gradient-to-r from-[#9a8faf]/10 to-[#b4a9c7]/10 rounded-lg p-4 border border-[#b4a9c7]/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#9a8faf] to-[#b4a9c7]">
                    <Waves className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">Surf Runner</h3>
                    <p className="text-sm text-muted-foreground">
                      Relaxing side-scrolling surf! Switch lanes to avoid obstacles and jump to perform tricks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Game Component */}
              <SurfGame />

              {/* Instructions */}
              <div className="bg-muted/30 rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">How to Play</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs">Desktop:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">↑</kbd> <kbd className="px-1 bg-muted rounded text-[10px]">↓</kbd> Switch lanes</li>
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">SPACE</kbd> Jump & do tricks!</li>
                      <li>• Earn bonus points for tricks</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs">Mobile:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• Swipe <strong>up/down</strong> to switch lanes</li>
                      <li>• Swipe <strong>right</strong> to jump & trick</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Game 2: Surf Runner 2 (Vertical endless runner) */}
          <TabsContent value="surf2" className="mt-0">
            <div className="space-y-4">
              {/* Game Info Card */}
              <div className="bg-gradient-to-r from-[#9a8faf]/10 to-[#b4a9c7]/10 rounded-lg p-4 border border-[#b4a9c7]/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#9a8faf] to-[#b4a9c7]">
                    <ArrowRight className="h-5 w-5 text-white rotate-[-90deg]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">Surf Runner 2</h3>
                    <p className="text-sm text-muted-foreground">
                      Relaxing ocean surfing! Avoid waves, logs, and buoys. Jump to perform awesome tricks!
                    </p>
                  </div>
                </div>
              </div>

              {/* Game Component */}
              <SurfRunner2 />

              {/* Instructions */}
              <div className="bg-muted/30 rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">How to Play</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs">Desktop:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">←</kbd> <kbd className="px-1 bg-muted rounded text-[10px]">→</kbd> Switch lanes</li>
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">↑</kbd> / <kbd className="px-1 bg-muted rounded text-[10px]">SPACE</kbd> Jump & trick</li>
                      <li>• Earn bonus points for tricks!</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs">Mobile:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• Swipe <strong>left/right</strong> to switch lanes</li>
                      <li>• Swipe <strong>up</strong> to jump & trick</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tips Section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-[#9a8faf]/10 to-[#b4a9c7]/10 rounded-lg border border-[#b4a9c7]/20">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <span>💡</span> Relaxation Tips
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Games are designed to be calm - no rush!</li>
            <li>• Jump to perform tricks and earn bonus points</li>
            <li>• Perfect for listening to audiobooks 🎧</li>
            <li>• Obstacles are spaced out for easy avoidance</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Game;
