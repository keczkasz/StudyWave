import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Gamepad2, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";

interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
}

interface Surfer {
  y: number;
  targetY: number;
  lane: number;
  isDucking: boolean;
}

interface Obstacle {
  x: number;
  lane: number;
  type: number; // 0=rock, 1=seagull, 2=barrel
  passed: boolean;
}

// Optimized color palette - vaporwave sunset vibes
const COLORS = {
  sky: ["#ff6b6b", "#feca57", "#ff9ff3", "#54a0ff"],
  water: ["#0abde3", "#10ac84", "#00d2d3"],
  sun: "#ffeaa7",
  sunCore: "#fdcb6e",
  foam: "#dfe6e9",
  sand: "#ffeaa7",
};

const SURFER_X = 80;
const SURFER_WIDTH = 32;
const SURFER_HEIGHT = 44;
const DUCK_HEIGHT = 26;
const LANE_COUNT = 3;
const GAME_SPEED_INITIAL = 5;
const OBSTACLE_GAP = 220;

const SurfGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem("surfGameHighScore") || "0"),
  });
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 280 });
  
  // Game state refs (avoid re-renders)
  const surferRef = useRef<Surfer>({ y: 140, targetY: 140, lane: 1, isDucking: false });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(GAME_SPEED_INITIAL);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Pre-calculated values
  const laneYRef = useRef<number[]>([]);

  // Calculate lane positions
  useEffect(() => {
    const h = canvasSize.height;
    laneYRef.current = [h * 0.25, h * 0.5, h * 0.75];
  }, [canvasSize.height]);

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = Math.min(containerRef.current.clientWidth - 8, 900);
        const h = window.innerWidth < 768 ? 220 : 280;
        setCanvasSize({ width: w, height: h });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Sound effect (simplified)
  const playSound = useCallback((freq: number, dur: number) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* Audio context may not be available */ }
  }, [soundEnabled]);

  // Reset game
  const resetGame = useCallback(() => {
    surferRef.current = { y: laneYRef.current[1], targetY: laneYRef.current[1], lane: 1, isDucking: false };
    obstaclesRef.current = [];
    speedRef.current = GAME_SPEED_INITIAL;
    scoreRef.current = 0;
    timeRef.current = 0;
    lastSpawnRef.current = canvasSize.width + 100;
  }, [canvasSize.width]);

  // Start game
  const startGame = useCallback(() => {
    resetGame();
    isPlayingRef.current = true;
    setGameState(prev => ({ ...prev, isPlaying: true, isGameOver: false, score: 0 }));
  }, [resetGame]);

  // End game
  const endGame = useCallback(() => {
    isPlayingRef.current = false;
    const newHigh = Math.max(gameState.highScore, scoreRef.current);
    localStorage.setItem("surfGameHighScore", newHigh.toString());
    setGameState({ isPlaying: false, isGameOver: true, score: scoreRef.current, highScore: newHigh });
    playSound(150, 0.3);
  }, [gameState.highScore, playSound]);

  // Movement
  const moveUp = useCallback(() => {
    const s = surferRef.current;
    if (s.lane > 0) {
      s.lane--;
      s.targetY = laneYRef.current[s.lane];
      playSound(500, 0.08);
    }
  }, [playSound]);

  const moveDown = useCallback(() => {
    const s = surferRef.current;
    if (s.lane < LANE_COUNT - 1) {
      s.lane++;
      s.targetY = laneYRef.current[s.lane];
      playSound(400, 0.08);
    }
  }, [playSound]);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current) {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (e.code === "ArrowUp" || e.code === "Space") { e.preventDefault(); moveUp(); }
      else if (e.code === "ArrowDown") { 
        e.preventDefault(); 
        if (!surferRef.current.isDucking) moveDown();
        surferRef.current.isDucking = true; 
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") surferRef.current.isDucking = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [startGame, moveUp, moveDown]);

  // Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      startY = e.touches[0].clientY;
      if (!isPlayingRef.current) startGame();
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isPlayingRef.current) return;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > 25) {
        if (dy < 0) moveUp(); else { moveDown(); surferRef.current.isDucking = true; }
        startY = e.touches[0].clientY;
      }
    };
    const onEnd = (e: TouchEvent) => { e.preventDefault(); surferRef.current.isDucking = false; };
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [startGame, moveUp, moveDown]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvasSize.width;
    const H = canvasSize.height;
    const laneH = H / LANE_COUNT;

    // Pre-create gradients
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    skyGrad.addColorStop(0, COLORS.sky[0]);
    skyGrad.addColorStop(0.4, COLORS.sky[1]);
    skyGrad.addColorStop(0.7, COLORS.sky[2]);
    skyGrad.addColorStop(1, COLORS.sky[3]);

    const waterGrad = ctx.createLinearGradient(0, H * 0.35, 0, H);
    waterGrad.addColorStop(0, COLORS.water[0]);
    waterGrad.addColorStop(0.5, COLORS.water[1]);
    waterGrad.addColorStop(1, COLORS.water[2]);

    const render = () => {
      timeRef.current++;
      const t = timeRef.current;

      // Clear & draw sky
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.4);

      // Sun (simple circle)
      ctx.fillStyle = COLORS.sun;
      ctx.beginPath();
      ctx.arc(W - 70, 45, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.sunCore;
      ctx.beginPath();
      ctx.arc(W - 70, 45, 24, 0, Math.PI * 2);
      ctx.fill();

      // Water
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, H * 0.35, W, H * 0.65);

      // Simple wave lines
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const baseY = H * 0.4 + i * 25;
        for (let x = 0; x < W; x += 20) {
          const y = baseY + Math.sin((x + t * 2) * 0.03) * 6;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Lane guides (subtle)
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([10, 10]);
      for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * laneH);
        ctx.lineTo(W, i * laneH);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      if (isPlayingRef.current) {
        // Update surfer position (smooth)
        const s = surferRef.current;
        s.y += (s.targetY - s.y) * 0.18;

        // Spawn obstacles
        if (lastSpawnRef.current < W - OBSTACLE_GAP && Math.random() < 0.025) {
          const lane = Math.floor(Math.random() * LANE_COUNT);
          const type = Math.floor(Math.random() * 3);
          obstaclesRef.current.push({ x: W + 50, lane, type, passed: false });
          lastSpawnRef.current = W + 50;
        }

        // Update obstacles
        const speed = speedRef.current;
        lastSpawnRef.current -= speed;
        
        obstaclesRef.current = obstaclesRef.current.filter(ob => {
          ob.x -= speed;
          
          // Score
          if (!ob.passed && ob.x + 40 < SURFER_X) {
            ob.passed = true;
            scoreRef.current += 10;
            if (scoreRef.current % 100 === 0) playSound(800, 0.1);
          }

          // Collision check
          const obY = laneYRef.current[ob.lane];
          const obW = ob.type === 1 ? 45 : 35;
          const obH = ob.type === 1 ? 25 : 35;
          const sH = s.isDucking ? DUCK_HEIGHT : SURFER_HEIGHT;
          
          // Skip collision for seagulls when ducking
          if (ob.type === 1 && s.isDucking) {
            // Draw seagull
            drawSeagull(ctx, ob.x, obY - 20, t);
            return ob.x > -60;
          }

          // Check collision
          if (ob.x < SURFER_X + SURFER_WIDTH - 8 && ob.x + obW > SURFER_X + 8 &&
              Math.abs(s.y - obY) < (sH + obH) / 2 - 10) {
            endGame();
            return false;
          }

          // Draw obstacle
          if (ob.type === 0) drawRock(ctx, ob.x, obY);
          else if (ob.type === 1) drawSeagull(ctx, ob.x, obY - 20, t);
          else drawBarrel(ctx, ob.x, obY);

          return ob.x > -60;
        });

        // Speed up
        speedRef.current += 0.001;
      }

      // Draw surfer
      const s = surferRef.current;
      drawSurfer(ctx, SURFER_X, s.y, s.isDucking, t);

      // UI
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px monospace";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(`SCORE: ${scoreRef.current}`, 12, 24);
      if (isPlayingRef.current) {
        ctx.fillText(`SPEED: ${Math.floor(speedRef.current * 10)}`, 12, 44);
      }
      ctx.shadowBlur = 0;

      // Idle/Game over overlay
      if (!isPlayingRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W/2 - 130, H/2 - 45, 260, 90);
        ctx.strokeStyle = COLORS.sun;
        ctx.lineWidth = 2;
        ctx.strokeRect(W/2 - 130, H/2 - 45, 260, 90);
        
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 20px monospace";
        
        if (gameState.isGameOver) {
          ctx.fillStyle = COLORS.sky[0];
          ctx.fillText("GAME OVER", W/2, H/2 - 15);
          ctx.fillStyle = "#fff";
          ctx.font = "14px monospace";
          ctx.fillText(`Score: ${gameState.score}`, W/2, H/2 + 8);
          ctx.fillText("Press SPACE to retry", W/2, H/2 + 30);
        } else {
          ctx.fillStyle = COLORS.sun;
          ctx.fillText("SURF RUNNER", W/2, H/2 - 12);
          ctx.fillStyle = "#fff";
          ctx.font = "12px monospace";
          ctx.fillText("↑↓: Move • Hold ↓: Duck", W/2, H/2 + 10);
          ctx.fillText("Press SPACE to start", W/2, H/2 + 28);
        }
        ctx.textAlign = "left";
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Drawing helpers
    const drawSurfer = (c: CanvasRenderingContext2D, x: number, y: number, duck: boolean, t: number) => {
      const bob = Math.sin(t * 0.1) * 2;
      const h = duck ? DUCK_HEIGHT : SURFER_HEIGHT;
      const drawY = y - h/2 + bob;
      
      // Board
      c.fillStyle = "#e74c3c";
      c.fillRect(x - 6, drawY + h - 6, SURFER_WIDTH + 12, 6);
      c.fillStyle = "#f39c12";
      c.fillRect(x + 4, drawY + h - 5, SURFER_WIDTH - 8, 3);
      
      if (duck) {
        // Ducking
        c.fillStyle = "#3498db";
        c.fillRect(x + 2, drawY + 8, SURFER_WIDTH - 4, h - 14);
        c.fillStyle = "#ffeaa7";
        c.fillRect(x + 8, drawY, 16, 12);
      } else {
        // Standing
        c.fillStyle = "#2ecc71";
        c.fillRect(x + 6, drawY + h - 20, 8, 16);
        c.fillRect(x + 18, drawY + h - 20, 8, 16);
        c.fillStyle = "#3498db";
        c.fillRect(x + 4, drawY + 14, SURFER_WIDTH - 8, 18);
        c.fillStyle = "#ffeaa7";
        c.fillRect(x + 8, drawY + 2, 16, 14);
        c.fillStyle = "#8b6914";
        c.fillRect(x + 8, drawY, 16, 6);
      }
    };

    const drawRock = (c: CanvasRenderingContext2D, x: number, y: number) => {
      c.fillStyle = "#636e72";
      c.beginPath();
      c.moveTo(x, y + 18);
      c.lineTo(x + 8, y - 10);
      c.lineTo(x + 20, y - 18);
      c.lineTo(x + 32, y - 8);
      c.lineTo(x + 38, y + 18);
      c.closePath();
      c.fill();
      c.fillStyle = "#b2bec3";
      c.beginPath();
      c.moveTo(x + 12, y);
      c.lineTo(x + 20, y - 14);
      c.lineTo(x + 26, y - 4);
      c.closePath();
      c.fill();
    };

    const drawSeagull = (c: CanvasRenderingContext2D, x: number, y: number, t: number) => {
      const flap = Math.sin(t * 0.25) * 6;
      c.fillStyle = "#dfe6e9";
      c.fillRect(x + 15, y + 8, 18, 10);
      c.fillStyle = "#b2bec3";
      c.fillRect(x, y + 6 - flap, 18, 6);
      c.fillRect(x + 30, y + 6 + flap, 18, 6);
      c.fillStyle = "#fdcb6e";
      c.fillRect(x + 32, y + 10, 8, 4);
    };

    const drawBarrel = (c: CanvasRenderingContext2D, x: number, y: number) => {
      c.fillStyle = "#a0522d";
      c.fillRect(x + 4, y - 16, 28, 32);
      c.fillStyle = "#5d4037";
      c.fillRect(x, y - 12, 36, 4);
      c.fillRect(x, y + 8, 36, 4);
      c.fillStyle = "#8b6914";
      c.fillRect(x + 12, y - 14, 6, 28);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, gameState.isGameOver, gameState.score, endGame, playSound]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border-2 border-orange-400/40">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-orange-500 to-pink-500">
          <div className="flex items-center gap-2 text-white">
            <Gamepad2 className="h-4 w-4" />
            <span className="font-bold text-sm tracking-wide">SURF RUNNER</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-white text-xs bg-black/20 px-2 py-1 rounded">
              <Trophy className="h-3 w-3 text-yellow-300" />
              <span className="font-mono">{gameState.highScore}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="h-7 w-7 text-white hover:bg-white/20">
              {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </Button>
            {gameState.isGameOver && (
              <Button variant="ghost" size="icon" onClick={startGame} className="h-7 w-7 text-white hover:bg-white/20">
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full cursor-pointer touch-none block"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="px-3 py-1.5 bg-gradient-to-r from-orange-500/10 to-pink-500/10 text-center text-[10px] text-muted-foreground md:hidden">
          Swipe ↑↓ to move • Hold down to duck
        </div>
      </div>
    </div>
  );
};

export default SurfGame;
