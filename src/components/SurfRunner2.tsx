import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Gamepad2, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";

interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
}

interface Runner {
  x: number;
  targetX: number;
  lane: number;
  jumpY: number;
  jumpVel: number;
  isJumping: boolean;
  isSliding: boolean;
}

interface Obstacle {
  y: number;
  lane: number;
  type: number; // 0=crate, 1=barrier, 2=bird
  passed: boolean;
}

// Vaporwave/sunset palette
const COLORS = {
  sky: ["#ff6b6b", "#feca57", "#ff9ff3", "#a29bfe"],
  sand: ["#ffeaa7", "#fdcb6e", "#f9ca24"],
  water: "#74b9ff",
  wave: "#0984e3",
  foam: "#dfe6e9",
  sun: "#ffeaa7",
  sunCore: "#fdcb6e",
};

const LANE_COUNT = 3;
const RUNNER_WIDTH = 36;
const RUNNER_HEIGHT = 52;
const SLIDE_HEIGHT = 28;
const GAME_SPEED_INITIAL = 6;
const OBSTACLE_GAP = 180;
const GRAVITY = 0.7;
const JUMP_FORCE = -13;

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
  const runnerRef = useRef<Runner>({ x: 170, targetX: 170, lane: 1, jumpY: 0, jumpVel: 0, isJumping: false, isSliding: false });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(GAME_SPEED_INITIAL);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);
  const waveYRef = useRef(550);
  const isPlayingRef = useRef(false);
  const laneXRef = useRef<number[]>([]);

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
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* Audio context may not be available */ }
  }, [soundEnabled]);

  // Reset
  const resetGame = useCallback(() => {
    runnerRef.current = { x: laneXRef.current[1], targetX: laneXRef.current[1], lane: 1, jumpY: 0, jumpVel: 0, isJumping: false, isSliding: false };
    obstaclesRef.current = [];
    speedRef.current = GAME_SPEED_INITIAL;
    scoreRef.current = 0;
    timeRef.current = 0;
    waveYRef.current = canvasSize.height + 80;
    lastSpawnRef.current = -100;
  }, [canvasSize.height]);

  // Start
  const startGame = useCallback(() => {
    resetGame();
    isPlayingRef.current = true;
    setGameState(prev => ({ ...prev, isPlaying: true, isGameOver: false, score: 0 }));
  }, [resetGame]);

  // End
  const endGame = useCallback(() => {
    isPlayingRef.current = false;
    const newHigh = Math.max(gameState.highScore, scoreRef.current);
    localStorage.setItem("surfRunner2HighScore", newHigh.toString());
    setGameState({ isPlaying: false, isGameOver: true, score: scoreRef.current, highScore: newHigh });
    playSound(150, 0.3);
  }, [gameState.highScore, playSound]);

  // Movement
  const moveLeft = useCallback(() => {
    const r = runnerRef.current;
    if (r.lane > 0) {
      r.lane--;
      r.targetX = laneXRef.current[r.lane];
      playSound(450, 0.06);
    }
  }, [playSound]);

  const moveRight = useCallback(() => {
    const r = runnerRef.current;
    if (r.lane < LANE_COUNT - 1) {
      r.lane++;
      r.targetX = laneXRef.current[r.lane];
      playSound(450, 0.06);
    }
  }, [playSound]);

  const jump = useCallback(() => {
    const r = runnerRef.current;
    if (!r.isJumping && !r.isSliding) {
      r.isJumping = true;
      r.jumpVel = JUMP_FORCE;
      playSound(600, 0.1);
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
      else if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); runnerRef.current.isSliding = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") runnerRef.current.isSliding = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
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
      } else if (Math.abs(dy) > 30) {
        if (dy < 0) jump(); else runnerRef.current.isSliding = true;
        startY = e.touches[0].clientY;
      }
    };
    const onEnd = (e: TouchEvent) => { e.preventDefault(); runnerRef.current.isSliding = false; };
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
    const runnerBaseY = H * 0.72;

    // Pre-create gradients
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    skyGrad.addColorStop(0, COLORS.sky[0]);
    skyGrad.addColorStop(0.35, COLORS.sky[1]);
    skyGrad.addColorStop(0.65, COLORS.sky[2]);
    skyGrad.addColorStop(1, COLORS.sky[3]);

    const sandGrad = ctx.createLinearGradient(0, H * 0.35, 0, H);
    sandGrad.addColorStop(0, COLORS.sand[0]);
    sandGrad.addColorStop(0.5, COLORS.sand[1]);
    sandGrad.addColorStop(1, COLORS.sand[2]);

    const render = () => {
      timeRef.current++;
      const t = timeRef.current;

      // Sky
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.5);

      // Sun
      const sunX = W * 0.75;
      ctx.fillStyle = COLORS.sun;
      ctx.beginPath();
      ctx.arc(sunX, 55, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.sunCore;
      ctx.beginPath();
      ctx.arc(sunX, 55, 26, 0, Math.PI * 2);
      ctx.fill();

      // Beach/sand perspective
      ctx.fillStyle = sandGrad;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.4);
      ctx.lineTo(W, H * 0.4);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // Lane lines (perspective)
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2, H * 0.35);
        ctx.lineTo(i * laneW, H);
        ctx.stroke();
      }

      // Decorative dots
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      for (let i = 0; i < 8; i++) {
        const py = H * 0.45 + i * 30 + (t % 40);
        const spread = (py - H * 0.35) / (H * 0.65) * W * 0.4;
        if (py < H) {
          ctx.fillRect(W/2 - spread, py, 4, 4);
          ctx.fillRect(W/2 + spread - 4, py, 4, 4);
        }
      }

      if (isPlayingRef.current) {
        const r = runnerRef.current;
        
        // Smooth lane movement
        r.x += (r.targetX - r.x) * 0.18;

        // Jump physics
        if (r.isJumping) {
          r.jumpVel += GRAVITY;
          r.jumpY += r.jumpVel;
          if (r.jumpY >= 0) {
            r.jumpY = 0;
            r.jumpVel = 0;
            r.isJumping = false;
          }
        }

        // Spawn obstacles
        if (lastSpawnRef.current > OBSTACLE_GAP && Math.random() < 0.035) {
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
          if (!ob.passed && ob.y > runnerBaseY + 30) {
            ob.passed = true;
            scoreRef.current += 10;
            if (scoreRef.current % 100 === 0) playSound(800, 0.1);
          }

          // Calculate obstacle position (perspective)
          const progress = (ob.y - H * 0.35) / (H * 0.65);
          const obX = laneXRef.current[ob.lane] + (laneXRef.current[ob.lane] - W/2) * progress * 0.5;
          const scale = 0.4 + progress * 0.6;
          const obW = 35 * scale;
          const obH = (ob.type === 2 ? 25 : 38) * scale;

          // Skip bird collision when sliding
          if (ob.type === 2 && r.isSliding) {
            drawObstacle(ctx, obX, ob.y - obH/2, obW, obH, ob.type, t);
            return ob.y < H + 50;
          }

          // Collision detection
          const rH = r.isSliding ? SLIDE_HEIGHT : RUNNER_HEIGHT;
          const rY = runnerBaseY + r.jumpY;
          if (ob.y > rY - rH/2 && ob.y < rY + rH/2 &&
              Math.abs(r.x - obX) < (RUNNER_WIDTH + obW) / 2 - 10 &&
              r.jumpY > -40) {
            endGame();
            return false;
          }

          drawObstacle(ctx, obX, ob.y - obH/2, obW, obH, ob.type, t);
          return ob.y < H + 50;
        });

        // Chasing wave
        waveYRef.current -= 0.008;
        if (waveYRef.current < H + 50) {
          const waveProgress = Math.max(0, 1 - (waveYRef.current - H * 0.8) / (H * 0.3));
          if (waveProgress > 0.95) {
            endGame();
          }
        }

        // Speed up
        speedRef.current += 0.001;
      }

      // Draw chasing wave
      drawWave(ctx, W, H, waveYRef.current, t);

      // Draw runner
      const r = runnerRef.current;
      drawRunner(ctx, r.x, runnerBaseY + r.jumpY, r.isSliding, r.isJumping, t);

      // UI
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(`SCORE: ${scoreRef.current}`, 10, 22);
      if (isPlayingRef.current) {
        ctx.fillText(`SPEED: ${Math.floor(speedRef.current * 10)}`, 10, 40);
      }
      ctx.shadowBlur = 0;

      // Overlay
      if (!isPlayingRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W/2 - 120, H/2 - 50, 240, 100);
        ctx.strokeStyle = COLORS.sun;
        ctx.lineWidth = 2;
        ctx.strokeRect(W/2 - 120, H/2 - 50, 240, 100);
        
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 18px monospace";
        
        if (gameState.isGameOver) {
          ctx.fillStyle = COLORS.sky[0];
          ctx.fillText("GAME OVER", W/2, H/2 - 18);
          ctx.fillStyle = "#fff";
          ctx.font = "13px monospace";
          ctx.fillText(`Score: ${gameState.score}`, W/2, H/2 + 6);
          ctx.fillText("Tap or SPACE to retry", W/2, H/2 + 28);
        } else {
          ctx.fillStyle = COLORS.sun;
          ctx.fillText("SURF RUNNER 2", W/2, H/2 - 18);
          ctx.fillStyle = "#fff";
          ctx.font = "11px monospace";
          ctx.fillText("←→: Move • ↑: Jump • ↓: Slide", W/2, H/2 + 6);
          ctx.fillText("Tap or SPACE to start", W/2, H/2 + 26);
        }
        ctx.textAlign = "left";
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Drawing helpers
    const drawRunner = (c: CanvasRenderingContext2D, x: number, y: number, slide: boolean, jump: boolean, t: number) => {
      const h = slide ? SLIDE_HEIGHT : RUNNER_HEIGHT;
      const w = RUNNER_WIDTH;
      const drawY = y - h/2;
      const bob = jump ? 0 : Math.sin(t * 0.2) * 2;

      // Shadow
      c.fillStyle = "rgba(0,0,0,0.2)";
      c.beginPath();
      c.ellipse(x, y + h/2 + 3, w * 0.5, 6, 0, 0, Math.PI * 2);
      c.fill();

      if (slide) {
        // Sliding pose
        c.fillStyle = "#3498db";
        c.fillRect(x - w/2, drawY + 12, w, h - 16);
        c.fillStyle = "#ffeaa7";
        c.fillRect(x - 8, drawY + 2, 16, 14);
        c.fillStyle = "#fdcb6e";
        c.fillRect(x - 8, drawY, 16, 6);
      } else {
        // Standing/running
        const legOffset = Math.sin(t * 0.3) * 4;
        // Legs
        c.fillStyle = "#3498db";
        c.fillRect(x - 10, drawY + h - 22 + bob, 8, 18);
        c.fillRect(x + 2, drawY + h - 22 - legOffset + bob, 8, 18);
        // Body
        c.fillStyle = "#e74c3c";
        c.fillRect(x - w/2 + 4, drawY + 16 + bob, w - 8, 22);
        // Head
        c.fillStyle = "#ffeaa7";
        c.fillRect(x - 10, drawY + bob, 20, 18);
        c.fillStyle = "#fdcb6e";
        c.fillRect(x - 10, drawY + bob - 2, 20, 8);
        // Arms
        c.fillStyle = "#ffeaa7";
        c.fillRect(x - w/2 - 2, drawY + 18 + bob + Math.sin(t * 0.25) * 3, 6, 12);
        c.fillRect(x + w/2 - 4, drawY + 18 + bob - Math.sin(t * 0.25) * 3, 6, 12);
      }
    };

    const drawObstacle = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: number, t: number) => {
      if (type === 0) {
        // Crate
        c.fillStyle = "#a0522d";
        c.fillRect(x - w/2, y, w, h);
        c.fillStyle = "#8b4513";
        c.fillRect(x - w/2 + 2, y + 2, w - 4, 3);
        c.fillRect(x - w/2 + 2, y + h - 5, w - 4, 3);
        c.fillRect(x - 2, y + 2, 4, h - 4);
      } else if (type === 1) {
        // Barrier
        c.fillStyle = "#e74c3c";
        c.fillRect(x - w/2, y, w, h);
        c.fillStyle = "#fff";
        c.fillRect(x - w/2 + 3, y + h * 0.3, w - 6, 4);
        c.fillRect(x - w/2 + 3, y + h * 0.6, w - 6, 4);
      } else {
        // Bird
        const flap = Math.sin(t * 0.2) * 5;
        c.fillStyle = "#dfe6e9";
        c.fillRect(x - 8, y + 6, 16, 10);
        c.fillStyle = "#b2bec3";
        c.fillRect(x - w/2, y + 4 - flap, 12, 5);
        c.fillRect(x + w/2 - 12, y + 4 + flap, 12, 5);
        c.fillStyle = "#fdcb6e";
        c.fillRect(x + 8, y + 8, 6, 4);
      }
    };

    const drawWave = (c: CanvasRenderingContext2D, W: number, H: number, waveY: number, t: number) => {
      if (waveY > H + 60) return;
      
      // Big wave
      const grad = c.createLinearGradient(0, waveY - 40, 0, H);
      grad.addColorStop(0, COLORS.foam);
      grad.addColorStop(0.15, COLORS.water);
      grad.addColorStop(0.4, COLORS.wave);
      grad.addColorStop(1, "#1a5276");
      
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(0, waveY);
      for (let x = 0; x <= W; x += 15) {
        const y = waveY - 25 + Math.sin((x + t * 3) * 0.04) * 15;
        c.lineTo(x, y);
      }
      c.lineTo(W, H);
      c.lineTo(0, H);
      c.closePath();
      c.fill();

      // Foam highlights
      c.fillStyle = "rgba(255,255,255,0.7)";
      for (let x = 10; x < W; x += 30) {
        const y = waveY - 20 + Math.sin((x + t * 3) * 0.04) * 14;
        c.fillRect(x, y, 12, 4);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, gameState.isGameOver, gameState.score, endGame, playSound]);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border-2 border-blue-400/40" style={{ maxWidth: 400 }}>
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500">
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
          style={{ imageRendering: "pixelated" }}
        />
        <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-center text-[10px] text-muted-foreground md:hidden">
          Swipe ←→: Move • ↑: Jump • ↓: Slide
        </div>
      </div>
    </div>
  );
};

export default SurfRunner2;
