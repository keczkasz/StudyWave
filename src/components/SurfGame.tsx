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
  jumpHeight: number;
  jumpVel: number;
  isJumping: boolean;
  trickRotation: number;
  trickType: string;
  trickScore: number;
}

interface Obstacle {
  x: number;
  lane: number;
  type: number; // 0=rock, 1=seagull, 2=barrel
  passed: boolean;
}

// Calm ocean palette - relaxing colors
const COLORS = {
  sky: ["#87CEEB", "#B0E0E6", "#E0F4FF", "#F0F8FF"],
  water: ["#4DB6E5", "#5BC0EB", "#7DD3FC"],
  sun: "#FFE4B5",
  sunCore: "#FFD700",
  foam: "#F0FFFF",
  board: "#CD853F",
  boardStripe: "#8B4513",
};

const SURFER_X = 90;
const SURFER_WIDTH = 36;
const SURFER_HEIGHT = 48;
const LANE_COUNT = 3;
const GAME_SPEED_INITIAL = 3.5; // Slower for relaxing gameplay
const OBSTACLE_GAP = 280; // More space between obstacles
const GRAVITY = 0.4; // Slow gravity for floaty jumps
const JUMP_FORCE = -9;

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
  const surferRef = useRef<Surfer>({ 
    y: 140, targetY: 140, lane: 1, 
    jumpHeight: 0, jumpVel: 0, isJumping: false,
    trickRotation: 0, trickType: "", trickScore: 0
  });
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
    laneYRef.current = [h * 0.28, h * 0.52, h * 0.76];
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

  // Sound effect (softer)
  const playSound = useCallback((freq: number, dur: number) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* Audio context may not be available */ }
  }, [soundEnabled]);

  // Reset game
  const resetGame = useCallback(() => {
    surferRef.current = { 
      y: laneYRef.current[1], targetY: laneYRef.current[1], lane: 1,
      jumpHeight: 0, jumpVel: 0, isJumping: false,
      trickRotation: 0, trickType: "", trickScore: 0
    };
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
    const finalScore = scoreRef.current + surferRef.current.trickScore;
    const newHigh = Math.max(gameState.highScore, finalScore);
    localStorage.setItem("surfGameHighScore", newHigh.toString());
    setGameState({ isPlaying: false, isGameOver: true, score: finalScore, highScore: newHigh });
    playSound(200, 0.2);
  }, [gameState.highScore, playSound]);

  // Movement
  const moveUp = useCallback(() => {
    const s = surferRef.current;
    if (s.lane > 0 && !s.isJumping) {
      s.lane--;
      s.targetY = laneYRef.current[s.lane];
      playSound(400, 0.06);
    }
  }, [playSound]);

  const moveDown = useCallback(() => {
    const s = surferRef.current;
    if (s.lane < LANE_COUNT - 1 && !s.isJumping) {
      s.lane++;
      s.targetY = laneYRef.current[s.lane];
      playSound(350, 0.06);
    }
  }, [playSound]);

  // Jump with tricks
  const jump = useCallback(() => {
    const s = surferRef.current;
    if (!s.isJumping) {
      s.isJumping = true;
      s.jumpVel = JUMP_FORCE;
      // Random trick
      const tricks = ["spin", "flip", "grab", "shuvit"];
      s.trickType = tricks[Math.floor(Math.random() * tricks.length)];
      s.trickRotation = 0;
      playSound(500, 0.08);
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
      if (e.code === "ArrowUp") { e.preventDefault(); moveUp(); }
      else if (e.code === "ArrowDown") { e.preventDefault(); moveDown(); }
      else if (e.code === "Space") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startGame, moveUp, moveDown, jump]);

  // Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let startY = 0;
    let startX = 0;
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      if (!isPlayingRef.current) startGame();
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isPlayingRef.current) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      
      // Horizontal swipe for jump
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        jump();
        startX = e.touches[0].clientX;
      }
      // Vertical swipe for lane change
      else if (Math.abs(dy) > 25) {
        if (dy < 0) moveUp(); else moveDown();
        startY = e.touches[0].clientY;
      }
    };
    const onEnd = (e: TouchEvent) => { e.preventDefault(); };
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [startGame, moveUp, moveDown, jump]);

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
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.35);
    skyGrad.addColorStop(0, COLORS.sky[0]);
    skyGrad.addColorStop(0.5, COLORS.sky[1]);
    skyGrad.addColorStop(1, COLORS.sky[2]);

    const waterGrad = ctx.createLinearGradient(0, H * 0.3, 0, H);
    waterGrad.addColorStop(0, COLORS.water[0]);
    waterGrad.addColorStop(0.5, COLORS.water[1]);
    waterGrad.addColorStop(1, COLORS.water[2]);

    const render = () => {
      timeRef.current++;
      const t = timeRef.current;

      // Clear & draw sky
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.35);

      // Sun
      ctx.fillStyle = COLORS.sun;
      ctx.beginPath();
      ctx.arc(W - 80, 40, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.sunCore;
      ctx.beginPath();
      ctx.arc(W - 80, 40, 26, 0, Math.PI * 2);
      ctx.fill();

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 4; i++) {
        const cx = ((t * 0.15 + i * 200) % (W + 150)) - 75;
        const cy = 25 + i * 18;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 20, cy - 3, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Water
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, H * 0.3, W, H * 0.7);

      // Gentle wave lines
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const baseY = H * 0.35 + i * 30;
        for (let x = 0; x < W; x += 15) {
          const y = baseY + Math.sin((x + t * 1.2) * 0.025) * 5;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Lane guides (very subtle)
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.setLineDash([12, 12]);
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
        s.y += (s.targetY - s.y) * 0.12;

        // Jump physics
        if (s.isJumping) {
          s.jumpVel += GRAVITY;
          s.jumpHeight += s.jumpVel;
          s.trickRotation += 10;
          
          if (s.jumpHeight >= 0) {
            s.jumpHeight = 0;
            s.jumpVel = 0;
            s.isJumping = false;
            // Award trick points
            if (s.trickRotation > 150) {
              s.trickScore += 20;
              playSound(650, 0.1);
            }
            s.trickRotation = 0;
            s.trickType = "";
          }
        }

        // Spawn obstacles (less frequently)
        if (lastSpawnRef.current < W - OBSTACLE_GAP && Math.random() < 0.015) {
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
            scoreRef.current += 5;
            if (scoreRef.current % 50 === 0) playSound(600, 0.08);
          }

          // Collision check (more forgiving + jump avoidance)
          const obY = laneYRef.current[ob.lane];
          const obW = ob.type === 1 ? 40 : 32;
          const obH = ob.type === 1 ? 22 : 32;
          
          // Skip collision when jumping high enough
          if (s.jumpHeight < -30) {
            drawObstacle(ctx, ob, t);
            return ob.x > -60;
          }

          // Check collision (more forgiving)
          if (ob.x < SURFER_X + SURFER_WIDTH - 12 && ob.x + obW > SURFER_X + 12 &&
              Math.abs((s.y + s.jumpHeight) - obY) < (SURFER_HEIGHT + obH) / 2 - 15) {
            endGame();
            return false;
          }

          drawObstacle(ctx, ob, t);
          return ob.x > -60;
        });

        // Very slow speed increase
        speedRef.current += 0.0003;
      }

      // Draw surfer
      const s = surferRef.current;
      drawSurfer(ctx, SURFER_X, s.y + s.jumpHeight, s.isJumping, s.trickRotation, s.trickType, t);

      // Show trick text
      if (s.isJumping && s.trickType) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 3;
        const trickName = s.trickType === "spin" ? "🌀 SPIN!" : 
                         s.trickType === "flip" ? "🔄 FLIP!" : 
                         s.trickType === "grab" ? "✋ GRAB!" : "🔃 SHUVIT!";
        ctx.fillText(trickName, SURFER_X - 15, s.y + s.jumpHeight - 35);
        ctx.shadowBlur = 0;
      }

      // UI
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px monospace";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(`SCORE: ${scoreRef.current + surferRef.current.trickScore}`, 12, 24);
      if (surferRef.current.trickScore > 0) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`TRICKS: +${surferRef.current.trickScore}`, 12, 42);
      }
      ctx.shadowBlur = 0;

      // Idle/Game over overlay
      if (!isPlayingRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W/2 - 140, H/2 - 48, 280, 96);
        ctx.strokeStyle = COLORS.sunCore;
        ctx.lineWidth = 2;
        ctx.strokeRect(W/2 - 140, H/2 - 48, 280, 96);
        
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 20px monospace";
        
        if (gameState.isGameOver) {
          ctx.fillStyle = "#87CEEB";
          ctx.fillText("GAME OVER", W/2, H/2 - 16);
          ctx.fillStyle = "#fff";
          ctx.font = "13px monospace";
          ctx.fillText(`Score: ${gameState.score}`, W/2, H/2 + 6);
          ctx.fillText("Press SPACE to retry", W/2, H/2 + 26);
        } else {
          ctx.fillStyle = "#87CEEB";
          ctx.fillText("🏄 SURF RUNNER", W/2, H/2 - 14);
          ctx.fillStyle = "#fff";
          ctx.font = "11px monospace";
          ctx.fillText("↑↓: Switch lanes • SPACE: Jump & Trick!", W/2, H/2 + 8);
          ctx.fillText("Press SPACE to start", W/2, H/2 + 26);
        }
        ctx.textAlign = "left";
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Drawing helpers
    const drawSurfer = (c: CanvasRenderingContext2D, x: number, y: number, jumping: boolean, rotation: number, trick: string, t: number) => {
      const bob = jumping ? 0 : Math.sin(t * 0.08) * 2;
      
      c.save();
      c.translate(x + SURFER_WIDTH/2, y + bob);
      
      // Apply trick rotation
      if (jumping && rotation > 0) {
        if (trick === "spin" || trick === "shuvit") {
          c.rotate((rotation * Math.PI) / 180);
        } else if (trick === "flip") {
          c.scale(1, Math.cos((rotation * Math.PI) / 180));
        }
      }

      // Shadow
      if (!jumping) {
        c.fillStyle = "rgba(0,0,0,0.15)";
        c.beginPath();
        c.ellipse(0, SURFER_HEIGHT/2 - 5, 22, 5, 0, 0, Math.PI * 2);
        c.fill();
      }

      // Surfboard
      c.fillStyle = COLORS.board;
      c.fillRect(-22, SURFER_HEIGHT/2 - 10, 44, 8);
      c.beginPath();
      c.moveTo(-22, SURFER_HEIGHT/2 - 6);
      c.lineTo(-28, SURFER_HEIGHT/2 - 6);
      c.lineTo(-22, SURFER_HEIGHT/2 - 2);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(22, SURFER_HEIGHT/2 - 6);
      c.lineTo(28, SURFER_HEIGHT/2 - 6);
      c.lineTo(22, SURFER_HEIGHT/2 - 2);
      c.closePath();
      c.fill();
      // Board stripe
      c.fillStyle = COLORS.boardStripe;
      c.fillRect(-18, SURFER_HEIGHT/2 - 8, 36, 2);

      // Legs
      c.fillStyle = "#2c3e50";
      c.fillRect(-8, SURFER_HEIGHT/2 - 22, 6, 14);
      c.fillRect(2, SURFER_HEIGHT/2 - 22, 6, 14);

      // Body (wetsuit)
      c.fillStyle = "#3498db";
      c.fillRect(-10, -SURFER_HEIGHT/2 + 14, 20, 20);

      // Arms
      c.fillStyle = "#ffeaa7";
      if (jumping && trick === "grab") {
        // Grabbing board
        c.fillRect(-16, SURFER_HEIGHT/2 - 16, 6, 10);
        c.fillRect(10, SURFER_HEIGHT/2 - 16, 6, 10);
      } else {
        // Balanced pose
        const armWave = Math.sin(t * 0.12) * 4;
        c.fillRect(-16, -SURFER_HEIGHT/2 + 16 + armWave, 6, 10);
        c.fillRect(10, -SURFER_HEIGHT/2 + 16 - armWave, 6, 10);
      }

      // Head
      c.fillStyle = "#ffeaa7";
      c.fillRect(-7, -SURFER_HEIGHT/2, 14, 14);
      
      // Hair
      c.fillStyle = "#fdcb6e";
      c.fillRect(-7, -SURFER_HEIGHT/2 - 2, 14, 6);

      c.restore();
    };

    const drawObstacle = (c: CanvasRenderingContext2D, ob: Obstacle, t: number) => {
      const obY = laneYRef.current[ob.lane];
      
      if (ob.type === 0) {
        // Rock
        c.fillStyle = "#7f8c8d";
        c.beginPath();
        c.moveTo(ob.x, obY + 16);
        c.lineTo(ob.x + 6, obY - 8);
        c.lineTo(ob.x + 16, obY - 14);
        c.lineTo(ob.x + 26, obY - 6);
        c.lineTo(ob.x + 32, obY + 16);
        c.closePath();
        c.fill();
        c.fillStyle = "#95a5a6";
        c.beginPath();
        c.moveTo(ob.x + 10, obY);
        c.lineTo(ob.x + 16, obY - 10);
        c.lineTo(ob.x + 22, obY - 2);
        c.closePath();
        c.fill();
      } else if (ob.type === 1) {
        // Seagull
        const flap = Math.sin(t * 0.2) * 6;
        c.fillStyle = "#ecf0f1";
        c.fillRect(ob.x + 12, obY + 6, 16, 8);
        c.fillStyle = "#bdc3c7";
        c.fillRect(ob.x, obY + 4 - flap, 14, 5);
        c.fillRect(ob.x + 26, obY + 4 + flap, 14, 5);
        c.fillStyle = "#f39c12";
        c.fillRect(ob.x + 28, obY + 8, 6, 3);
      } else {
        // Barrel/buoy
        c.fillStyle = "#e74c3c";
        c.beginPath();
        c.arc(ob.x + 16, obY, 14, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#fff";
        c.fillRect(ob.x + 4, obY - 3, 24, 6);
        c.fillStyle = "rgba(255,255,255,0.4)";
        c.beginPath();
        c.arc(ob.x + 11, obY - 5, 4, 0, Math.PI * 2);
        c.fill();
      }
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, gameState.isGameOver, gameState.score, endGame, playSound]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border-2 border-[#b4a9c7]/40">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#9a8faf] to-[#b4a9c7]">
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
          style={{ imageRendering: "auto" }}
        />
        <div className="px-3 py-1.5 bg-gradient-to-r from-[#9a8faf]/10 to-[#b4a9c7]/10 text-center text-[10px] text-muted-foreground md:hidden">
          Swipe ↑↓: Move • Swipe →: Jump & trick!
        </div>
      </div>
    </div>
  );
};

export default SurfGame;
