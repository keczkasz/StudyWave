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
  x: number;
  targetX: number;
  lane: number;
  jumpY: number;
  jumpVel: number;
  isJumping: boolean;
  trickRotation: number;
  trickType: string;
}

interface Obstacle {
  y: number;
  lane: number;
  type: number; // 0=wave, 1=log, 2=buoy
  passed: boolean;
}

// Calm ocean palette - relaxing colors
const COLORS = {
  sky: ["#87CEEB", "#B0E0E6", "#E0F4FF", "#F0F8FF"],
  water: ["#4DB6E5", "#5BC0EB", "#7DD3FC", "#A7E8FF"],
  sand: "#F5DEB3",
  sun: "#FFE4B5",
  sunCore: "#FFD700",
  foam: "#F0FFFF",
  board: "#CD853F",
  boardStripe: "#8B4513",
};

const LANE_COUNT = 3;
const SURFER_WIDTH = 40;
const SURFER_HEIGHT = 50;
const GAME_SPEED_INITIAL = 3; // Slower for relaxing gameplay
const OBSTACLE_GAP = 300; // More space between obstacles
const GRAVITY = 0.5; // Slower gravity for floaty jumps
const JUMP_FORCE = -10;

const SurfRunner2 = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(-100);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem("surfRunner2HighScore") || "0"),
  });
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 340, height: 500 });
  
  // Game refs
  const surferRef = useRef<Surfer>({ 
    x: 170, targetX: 170, lane: 1, jumpY: 0, jumpVel: 0, 
    isJumping: false, trickRotation: 0, trickType: "" 
  });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(GAME_SPEED_INITIAL);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const laneXRef = useRef<number[]>([]);
  const trickScoreRef = useRef(0);

  // Calculate lanes
  useEffect(() => {
    const w = canvasSize.width;
    const lw = w / LANE_COUNT;
    laneXRef.current = [lw * 0.5, lw * 1.5, lw * 2.5];
  }, [canvasSize.width]);

  // Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const maxW = Math.min(containerRef.current.clientWidth - 8, 380);
        const w = Math.max(280, maxW);
        const h = window.innerWidth < 768 ? 440 : 500;
        setCanvasSize({ width: w, height: h });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Sound
  const playSound = useCallback((freq: number, dur: number) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine"; // Softer sound
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* Audio context may not be available */ }
  }, [soundEnabled]);

  // Reset
  const resetGame = useCallback(() => {
    surferRef.current = { 
      x: laneXRef.current[1], targetX: laneXRef.current[1], lane: 1, 
      jumpY: 0, jumpVel: 0, isJumping: false, trickRotation: 0, trickType: "" 
    };
    obstaclesRef.current = [];
    speedRef.current = GAME_SPEED_INITIAL;
    scoreRef.current = 0;
    timeRef.current = 0;
    lastSpawnRef.current = -100;
    trickScoreRef.current = 0;
  }, []);

  // Start
  const startGame = useCallback(() => {
    resetGame();
    isPlayingRef.current = true;
    setGameState(prev => ({ ...prev, isPlaying: true, isGameOver: false, score: 0 }));
  }, [resetGame]);

  // End
  const endGame = useCallback(() => {
    isPlayingRef.current = false;
    const finalScore = scoreRef.current + trickScoreRef.current;
    const newHigh = Math.max(gameState.highScore, finalScore);
    localStorage.setItem("surfRunner2HighScore", newHigh.toString());
    setGameState({ isPlaying: false, isGameOver: true, score: finalScore, highScore: newHigh });
    playSound(200, 0.2);
  }, [gameState.highScore, playSound]);

  // Movement
  const moveLeft = useCallback(() => {
    const s = surferRef.current;
    if (s.lane > 0) {
      s.lane--;
      s.targetX = laneXRef.current[s.lane];
      playSound(350, 0.05);
    }
  }, [playSound]);

  const moveRight = useCallback(() => {
    const s = surferRef.current;
    if (s.lane < LANE_COUNT - 1) {
      s.lane++;
      s.targetX = laneXRef.current[s.lane];
      playSound(350, 0.05);
    }
  }, [playSound]);

  const jump = useCallback(() => {
    const s = surferRef.current;
    if (!s.isJumping) {
      s.isJumping = true;
      s.jumpVel = JUMP_FORCE;
      // Random trick
      const tricks = ["spin", "flip", "grab"];
      s.trickType = tricks[Math.floor(Math.random() * tricks.length)];
      s.trickRotation = 0;
      playSound(500, 0.08);
    }
  }, [playSound]);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current) {
        if (["Space", "ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"].includes(e.code)) {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); moveLeft(); }
      else if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); moveRight(); }
      else if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startGame, moveLeft, moveRight, jump]);

  // Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let startX = 0, startY = 0;
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      if (!isPlayingRef.current) startGame();
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isPlayingRef.current) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) moveLeft(); else moveRight();
        startX = e.touches[0].clientX;
      } else if (dy < -30) {
        jump();
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
  }, [startGame, moveLeft, moveRight, jump]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvasSize.width;
    const H = canvasSize.height;
    const laneW = W / LANE_COUNT;
    const surferBaseY = H * 0.7;

    // Pre-create gradients
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    skyGrad.addColorStop(0, COLORS.sky[0]);
    skyGrad.addColorStop(0.4, COLORS.sky[1]);
    skyGrad.addColorStop(0.7, COLORS.sky[2]);
    skyGrad.addColorStop(1, COLORS.sky[3]);

    const waterGrad = ctx.createLinearGradient(0, H * 0.35, 0, H);
    waterGrad.addColorStop(0, COLORS.water[0]);
    waterGrad.addColorStop(0.4, COLORS.water[1]);
    waterGrad.addColorStop(0.7, COLORS.water[2]);
    waterGrad.addColorStop(1, COLORS.water[3]);

    const render = () => {
      timeRef.current++;
      const t = timeRef.current;

      // Sky
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.45);

      // Sun
      const sunX = W * 0.75;
      ctx.fillStyle = COLORS.sun;
      ctx.beginPath();
      ctx.arc(sunX, 50, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.sunCore;
      ctx.beginPath();
      ctx.arc(sunX, 50, 30, 0, Math.PI * 2);
      ctx.fill();

      // Clouds (simple, relaxing)
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 3; i++) {
        const cx = ((t * 0.2 + i * 150) % (W + 100)) - 50;
        const cy = 40 + i * 25;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 35, 15, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 25, cy - 5, 25, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 20, cy + 3, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ocean water
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, H * 0.4, W, H * 0.6);

      // Gentle wave patterns
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const baseY = H * 0.45 + i * 40 + (t * 0.5 % 40);
        for (let x = 0; x <= W; x += 15) {
          const y = baseY + Math.sin((x + t * 0.8) * 0.03) * 5;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Lane guides (subtle)
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 12]);
      for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, H * 0.5);
        ctx.lineTo(i * laneW, H);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      if (isPlayingRef.current) {
        const s = surferRef.current;
        
        // Smooth lane movement
        s.x += (s.targetX - s.x) * 0.12;

        // Jump physics
        if (s.isJumping) {
          s.jumpVel += GRAVITY;
          s.jumpY += s.jumpVel;
          s.trickRotation += 12; // Trick rotation
          
          if (s.jumpY >= 0) {
            s.jumpY = 0;
            s.jumpVel = 0;
            s.isJumping = false;
            // Award trick points
            if (s.trickRotation > 180) {
              trickScoreRef.current += 25;
              playSound(700, 0.1);
            }
            s.trickRotation = 0;
            s.trickType = "";
          }
        }

        // Spawn obstacles (less frequently for relaxed gameplay)
        if (lastSpawnRef.current > OBSTACLE_GAP && Math.random() < 0.02) {
          const lane = Math.floor(Math.random() * LANE_COUNT);
          const type = Math.floor(Math.random() * 3);
          obstaclesRef.current.push({ y: -40, lane, type, passed: false });
          lastSpawnRef.current = 0;
        }

        // Update and draw obstacles
        const speed = speedRef.current;
        lastSpawnRef.current += speed;

        obstaclesRef.current = obstaclesRef.current.filter(ob => {
          ob.y += speed;
          
          // Score when passed
          if (!ob.passed && ob.y > surferBaseY + 30) {
            ob.passed = true;
            scoreRef.current += 5;
            if (scoreRef.current % 50 === 0) playSound(600, 0.08);
          }

          // Calculate obstacle position
          const obX = laneXRef.current[ob.lane];
          const obW = 40;
          const obH = ob.type === 2 ? 35 : 45;

          // Collision detection (more forgiving for relaxed gameplay)
          const sY = surferBaseY + s.jumpY;
          if (ob.y > sY - SURFER_HEIGHT/2 && ob.y < sY + SURFER_HEIGHT/2 - 10 &&
              Math.abs(s.x - obX) < (SURFER_WIDTH + obW) / 2 - 15 &&
              s.jumpY > -35) { // Can jump over obstacles
            endGame();
            return false;
          }

          drawObstacle(ctx, obX, ob.y, obW, obH, ob.type, t);
          return ob.y < H + 50;
        });

        // Very slow speed increase (relaxed)
        speedRef.current += 0.0003;
      }

      // Draw surfer on surfboard
      const s = surferRef.current;
      drawSurfer(ctx, s.x, surferBaseY + s.jumpY, s.isJumping, s.trickRotation, s.trickType, t);

      // Show trick text
      if (s.isJumping && s.trickType) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 3;
        const trickName = s.trickType === "spin" ? "🌀 SPIN!" : s.trickType === "flip" ? "🔄 FLIP!" : "✋ GRAB!";
        ctx.fillText(trickName, s.x, surferBaseY + s.jumpY - 45);
        ctx.shadowBlur = 0;
      }

      // UI
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(`SCORE: ${scoreRef.current + trickScoreRef.current}`, 10, 22);
      if (trickScoreRef.current > 0) {
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`TRICKS: +${trickScoreRef.current}`, 10, 40);
      }
      ctx.shadowBlur = 0;

      // Overlay
      if (!isPlayingRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W/2 - 130, H/2 - 55, 260, 110);
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        ctx.strokeRect(W/2 - 130, H/2 - 55, 260, 110);
        
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 20px monospace";
        
        if (gameState.isGameOver) {
          ctx.fillStyle = "#87CEEB";
          ctx.fillText("GAME OVER", W/2, H/2 - 22);
          ctx.fillStyle = "#fff";
          ctx.font = "13px monospace";
          ctx.fillText(`Score: ${gameState.score}`, W/2, H/2 + 2);
          ctx.fillText("Tap or SPACE to retry", W/2, H/2 + 24);
        } else {
          ctx.fillStyle = "#87CEEB";
          ctx.fillText("🏄 SURF RUNNER 2", W/2, H/2 - 22);
          ctx.fillStyle = "#fff";
          ctx.font = "11px monospace";
          ctx.fillText("←→: Switch lanes • ↑: Jump & Trick", W/2, H/2 + 2);
          ctx.fillText("Avoid obstacles • Perform tricks!", W/2, H/2 + 20);
          ctx.fillText("Tap or SPACE to start", W/2, H/2 + 40);
        }
        ctx.textAlign = "left";
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Drawing helpers
    const drawSurfer = (c: CanvasRenderingContext2D, x: number, y: number, jumping: boolean, rotation: number, trick: string, t: number) => {
      const bob = jumping ? 0 : Math.sin(t * 0.08) * 2;
      
      c.save();
      c.translate(x, y + bob);
      
      // Apply trick rotation
      if (jumping && rotation > 0) {
        if (trick === "spin") {
          c.rotate((rotation * Math.PI) / 180);
        } else if (trick === "flip") {
          c.scale(1, Math.cos((rotation * Math.PI) / 180));
        }
      }

      // Shadow
      c.fillStyle = "rgba(0,0,0,0.15)";
      c.beginPath();
      c.ellipse(0, SURFER_HEIGHT/2 + 8, 25, 8, 0, 0, Math.PI * 2);
      c.fill();

      // Surfboard
      c.fillStyle = COLORS.board;
      c.beginPath();
      c.ellipse(0, SURFER_HEIGHT/2 - 2, 28, 6, 0, 0, Math.PI * 2);
      c.fill();
      // Board stripe
      c.fillStyle = COLORS.boardStripe;
      c.fillRect(-20, SURFER_HEIGHT/2 - 4, 40, 2);
      // Board fin
      c.fillStyle = "#2c3e50";
      c.beginPath();
      c.moveTo(-3, SURFER_HEIGHT/2 + 3);
      c.lineTo(3, SURFER_HEIGHT/2 + 3);
      c.lineTo(0, SURFER_HEIGHT/2 + 10);
      c.closePath();
      c.fill();

      // Legs
      c.fillStyle = "#3498db";
      c.fillRect(-8, SURFER_HEIGHT/2 - 20, 7, 18);
      c.fillRect(1, SURFER_HEIGHT/2 - 20, 7, 18);

      // Body (wetsuit)
      c.fillStyle = "#2c3e50";
      c.fillRect(-10, -12, 20, 25);

      // Arms (raised when doing tricks)
      c.fillStyle = "#ffeaa7";
      if (jumping && trick === "grab") {
        c.fillRect(-18, -5, 8, 10);
        c.fillRect(10, -5, 8, 10);
      } else {
        c.fillRect(-16, -8 + Math.sin(t * 0.15) * 3, 6, 12);
        c.fillRect(10, -8 - Math.sin(t * 0.15) * 3, 6, 12);
      }

      // Head
      c.fillStyle = "#ffeaa7";
      c.fillRect(-8, -28, 16, 16);
      
      // Hair
      c.fillStyle = "#fdcb6e";
      c.fillRect(-8, -30, 16, 8);

      c.restore();
    };

    const drawObstacle = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: number, t: number) => {
      if (type === 0) {
        // Wave/water splash obstacle
        c.fillStyle = "#1e90ff";
        c.beginPath();
        c.moveTo(x - w/2, y + h/2);
        for (let i = 0; i <= w; i += 8) {
          const waveY = y - h/3 + Math.sin((i + t * 2) * 0.15) * 8;
          c.lineTo(x - w/2 + i, waveY);
        }
        c.lineTo(x + w/2, y + h/2);
        c.closePath();
        c.fill();
        // Foam
        c.fillStyle = "rgba(255,255,255,0.8)";
        for (let i = 0; i < 3; i++) {
          const fx = x - w/3 + i * (w/3);
          const fy = y - h/4 + Math.sin((fx + t * 2) * 0.15) * 8;
          c.fillRect(fx - 4, fy - 2, 8, 4);
        }
      } else if (type === 1) {
        // Floating log
        c.fillStyle = "#8B4513";
        c.fillRect(x - w/2, y - 8, w, 16);
        c.fillStyle = "#654321";
        c.fillRect(x - w/2 + 5, y - 6, 4, 12);
        c.fillRect(x + w/4, y - 6, 4, 12);
        // Bark texture
        c.fillStyle = "#5D4037";
        c.fillRect(x - w/2, y - 3, w, 3);
      } else {
        // Buoy
        c.fillStyle = "#e74c3c";
        c.beginPath();
        c.arc(x, y, 16, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#fff";
        c.fillRect(x - 12, y - 3, 24, 6);
        // Reflection
        c.fillStyle = "rgba(255,255,255,0.4)";
        c.beginPath();
        c.arc(x - 5, y - 5, 5, 0, Math.PI * 2);
        c.fill();
      }
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, gameState.isGameOver, gameState.score, endGame, playSound]);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border-2 border-[#b4a9c7]/40" style={{ maxWidth: 400 }}>
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#9a8faf] to-[#b4a9c7]">
          <div className="flex items-center gap-2 text-white">
            <Gamepad2 className="h-4 w-4" />
            <span className="font-bold text-sm tracking-wide">SURF RUNNER 2</span>
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
          Swipe ←→: Move • ↑: Jump & do tricks!
        </div>
      </div>
    </div>
  );
};

export default SurfRunner2;
