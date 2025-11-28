import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import SurfGame from "@/components/SurfGame";
import { Trophy, Waves, Info } from "lucide-react";

const Game = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [highScore] = useState(
    parseInt(localStorage.getItem("surfGameHighScore") || "0")
  );

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
        <div className="text-center mb-4 sm:mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-3 sm:mb-6 relative">
            <Waves className="h-10 w-10 sm:h-14 sm:w-14 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 sm:p-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-800" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            🏄 Surf Runner
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4">
            Ride the waves and avoid obstacles! Perfect for playing while listening to your audiobooks.
          </p>
          
          {/* High Score Display */}
          {highScore > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-full border border-yellow-500/20">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                Best: {highScore}
              </span>
            </div>
          )}
        </div>

        {/* Game */}
        <SurfGame />

        {/* Instructions */}
        <div className="mt-6 sm:mt-8 bg-muted/30 rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base sm:text-lg">How to Play</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Desktop Controls</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑</kbd> - Jump over rocks</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↓</kbd> - Duck under seagulls</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Mobile Controls</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Tap</strong> - Jump over rocks</li>
                <li>• <strong>Swipe Down</strong> - Duck under seagulls</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="font-medium text-foreground mb-2">Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>🪨 Rocks appear at ground level - jump over them!</li>
              <li>🐦 Seagulls fly high - duck to avoid them!</li>
              <li>⚡ The game speeds up as your score increases</li>
              <li>🎧 Play while listening to audiobooks on the Player page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
