import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import SurfGame from "@/components/SurfGame";
import SurfRunner2 from "@/components/SurfRunner2";
import { Trophy, Waves, Info, Gamepad2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 mb-3 sm:mb-4 relative shadow-lg">
            <Gamepad2 className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 sm:p-2 shadow-md">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-800" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            🏄 Surf Games
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4">
            Choose your adventure! Play while listening to audiobooks.
          </p>
        </div>

        {/* Game Selection Tabs */}
        <Tabs value={selectedGame} onValueChange={(v) => setSelectedGame(v as "surf1" | "surf2")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1 bg-muted/50">
            <TabsTrigger 
              value="surf1" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
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
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
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
              <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-lg p-4 border border-orange-500/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500">
                    <Waves className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">Surf Runner</h3>
                    <p className="text-sm text-muted-foreground">
                      Classic side-scrolling surf action! Dodge rocks, barrels, and seagulls while riding the waves.
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
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">↑</kbd> / <kbd className="px-1 bg-muted rounded text-[10px]">SPACE</kbd> Move up</li>
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">↓</kbd> Move down + Duck</li>
                      <li>• Hold <kbd className="px-1 bg-muted rounded text-[10px]">↓</kbd> to duck under seagulls</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs">Mobile:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• Swipe <strong>up</strong> to move up</li>
                      <li>• Swipe <strong>down</strong> to move down & duck</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Game 2: Surf Runner 2 (Subway Surfers style) */}
          <TabsContent value="surf2" className="mt-0">
            <div className="space-y-4">
              {/* Game Info Card */}
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                    <ArrowRight className="h-5 w-5 text-white rotate-[-90deg]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">Surf Runner 2</h3>
                    <p className="text-sm text-muted-foreground">
                      Escape the giant wave! Run forward, switch lanes, jump over obstacles, and slide under birds!
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
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">↑</kbd> / <kbd className="px-1 bg-muted rounded text-[10px]">SPACE</kbd> Jump</li>
                      <li>• <kbd className="px-1 bg-muted rounded text-[10px]">↓</kbd> Slide under birds</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs">Mobile:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• Swipe <strong>left/right</strong> to switch lanes</li>
                      <li>• Swipe <strong>up</strong> to jump</li>
                      <li>• Swipe <strong>down</strong> to slide</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tips Section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/20">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <span>💡</span> Pro Tips
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• The games speed up over time - stay focused!</li>
            <li>• In Surf Runner 2, slide under birds to avoid them</li>
            <li>• Time your movements - don't panic!</li>
            <li>• Play while listening to audiobooks on the Player page 🎧</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Game;
