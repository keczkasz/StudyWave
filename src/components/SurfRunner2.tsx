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
  y: number;
  targetLane: number;
  currentLane: number;
  width: number;
  height: number;
  isJumping: boolean;
  jumpVelocity: number;
  jumpHeight: number;
  isSliding: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "crate" | "barrier" | "bird" | "coin";
  lane: number;
  passed: boolean;
}

// Low-poly color palette - sunset surf vibes (matching SurfGame)
const COLORS = {
  sky1: "#ff6b35",
  sky2: "#f7931e",
  sky3: "#ffb347",
  sky4: "#87ceeb",
  water1: "#1a5276",
  water2: "#2980b9",
  water3: "#5dade2",
  foam: "#ecf0f1",
  sun: "#fff176",
  sunGlow: "#ffcc02",
  sand: "#f4d03f",
  sandDark: "#d4ac0d",
  wave: "#1e3799",
  waveLight: "#4a69bd",
  runner: "#ffd5b4",
  shirt: "#e74c3c",
  shorts: "#3498db",
  crate: "#8b4513",
  crateLight: "#a0522d",
  barrier: "#e74c3c",
  barrierStripe: "#ecf0f1",
};

const GAME_SPEED_INITIAL = 8;
const GAME_SPEED_INCREMENT = 0.003;
const OBSTACLE_SPAWN_RATE = 0.012;
const MIN_OBSTACLE_GAP = 120;
const LANE_COUNT = 3;
const LANE_SWITCH_SPEED = 0.2;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;

const SurfRunner2 = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>();
  const lastObstacleYRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem("surfRunner2HighScore") || "0"),
  });
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });
  
  const runnerRef = useRef<Runner>({
    x: 200,
    y: 450,
    targetLane: 1,
    currentLane: 1,
    width: 40,
    height: 60,
    isJumping: false,
    jumpVelocity: 0,
    jumpHeight: 0,
    isSliding: false,
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const gameSpeedRef = useRef(GAME_SPEED_INITIAL);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);
  const waveYRef = useRef(700);

  // Get lane X position
  const getLaneX = useCallback((lane: number, width: number) => {
    const laneWidth = width / LANE_COUNT;
    return laneWidth * lane + laneWidth / 2;
  }, []);

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const isMobile = window.innerWidth < 768;
        const width = Math.min(containerWidth - 16, 450);
        const height = isMobile ? Math.min(500, window.innerHeight * 0.6) : 550;
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const centerX = getLaneX(1, canvasSize.width);
    runnerRef.current = {
      x: centerX,
      y: canvasSize.height - 150,
      targetLane: 1,
      currentLane: 1,
      width: 40,
      height: 60,
      isJumping: false,
      jumpVelocity: 0,
      jumpHeight: 0,
      isSliding: false,
    };
    obstaclesRef.current = [];
    gameSpeedRef.current = GAME_SPEED_INITIAL;
    scoreRef.current = 0;
    frameCountRef.current = 0;
    lastObstacleYRef.current = -200;
    waveYRef.current = canvasSize.height + 100;
  }, [canvasSize.width, canvasSize.height, getLaneX]);

  // Start game
  const startGame = useCallback(() => {
    resetGame();
    setGameState((prev) => ({
      ...prev,
      isPlaying: true,
      isGameOver: false,
      score: 0,
    }));
  }, [resetGame]);

  // Play sound effects
  const playSound = useCallback((type: "jump" | "hit" | "score" | "slide") => {
    if (!soundEnabled) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === "jump") {
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(700, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } else if (type === "hit") {
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.25);
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.25);
      } else if (type === "score") {
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(900, audioContext.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } else if (type === "slide") {
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.08);
      }
    } catch {
      // Audio context not available
    }
  }, [soundEnabled]);

  // Handle movement
  const moveLeft = useCallback(() => {
    const runner = runnerRef.current;
    if (runner.targetLane > 0) {
      runner.targetLane--;
      playSound("slide");
    }
  }, [playSound]);

  const moveRight = useCallback(() => {
    const runner = runnerRef.current;
    if (runner.targetLane < LANE_COUNT - 1) {
      runner.targetLane++;
      playSound("slide");
    }
  }, [playSound]);

  const jump = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner.isJumping) {
      runner.isJumping = true;
      runner.jumpVelocity = JUMP_FORCE;
      playSound("jump");
    }
  }, [playSound]);

  const setSliding = useCallback((isSliding: boolean) => {
    runnerRef.current.isSliding = isSliding;
    if (isSliding) {
      runnerRef.current.height = 35;
    } else {
      runnerRef.current.height = 60;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState.isPlaying) {
        if (e.code === "Space" || e.code === "ArrowUp") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        moveLeft();
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        moveRight();
      } else if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
        e.preventDefault();
        jump();
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        setSliding(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        setSliding(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState.isPlaying, moveLeft, moveRight, jump, setSliding, startGame]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      if (!gameState.isPlaying) {
        startGame();
        return;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!gameState.isPlaying) return;
      
      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const deltaX = touchCurrentX - touchStartX;
      const deltaY = touchCurrentY - touchStartY;
      
      if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          moveLeft();
        } else {
          moveRight();
        }
        touchStartX = touchCurrentX;
      } else if (deltaY < -40) {
        jump();
        touchStartY = touchCurrentY;
      } else if (deltaY > 30) {
        setSliding(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setSliding(false);
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gameState.isPlaying, moveLeft, moveRight, jump, setSliding, startGame]);

  // Draw pixelated rectangle helper
  const drawPixelRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }, []);

  // Draw background (forward perspective beach/pier)
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.3);
    gradient.addColorStop(0, COLORS.sky1);
    gradient.addColorStop(0.5, COLORS.sky2);
    gradient.addColorStop(1, COLORS.sky3);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height * 0.3);

    // Sun
    ctx.fillStyle = COLORS.sunGlow;
    ctx.beginPath();
    ctx.arc(width / 2, 60, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath();
    ctx.arc(width / 2, 60, 32, 0, Math.PI * 2);
    ctx.fill();

    // Pier/beach running surface with perspective
    const horizonY = height * 0.25;
    
    // Sand/pier base
    ctx.fillStyle = COLORS.sand;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width, horizonY);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Perspective lines
    const vanishX = width / 2;
    const vanishY = horizonY - 20;
    
    // Lane dividers with perspective
    ctx.strokeStyle = COLORS.sandDark;
    ctx.lineWidth = 3;
    
    for (let i = 0; i <= LANE_COUNT; i++) {
      const startX = (width / LANE_COUNT) * i;
      ctx.beginPath();
      ctx.moveTo(vanishX, vanishY);
      ctx.lineTo(startX, height + 50);
      ctx.stroke();
    }

    // Horizontal lines for depth (scrolling)
    const scrollOffset = (time * gameSpeedRef.current * 0.5) % 80;
    ctx.strokeStyle = "rgba(212, 172, 13, 0.5)";
    ctx.lineWidth = 2;
    
    for (let y = horizonY; y < height; y += 40) {
      const adjustedY = y + scrollOffset;
      if (adjustedY > horizonY && adjustedY < height) {
        const perspective = (adjustedY - horizonY) / (height - horizonY);
        const lineWidth = width * (0.2 + perspective * 0.8);
        const startX = (width - lineWidth) / 2;
        
        ctx.beginPath();
        ctx.moveTo(startX, adjustedY);
        ctx.lineTo(startX + lineWidth, adjustedY);
        ctx.stroke();
      }
    }

    // Side decorations (pixel palm trees in distance)
    ctx.fillStyle = "#2d5016";
    for (let i = 0; i < 3; i++) {
      const treeX = 30 + i * 40;
      const treeY = horizonY + 10 + i * 5;
      // Trunk
      drawPixelRect(ctx, treeX + 8, treeY, 6, 20, "#5d4e37");
      // Leaves
      drawPixelRect(ctx, treeX, treeY - 8, 22, 8, "#2d5016");
      drawPixelRect(ctx, treeX + 4, treeY - 14, 14, 8, "#27ae60");
    }
    
    for (let i = 0; i < 3; i++) {
      const treeX = width - 50 - i * 40;
      const treeY = horizonY + 10 + i * 5;
      drawPixelRect(ctx, treeX + 8, treeY, 6, 20, "#5d4e37");
      drawPixelRect(ctx, treeX, treeY - 8, 22, 8, "#2d5016");
      drawPixelRect(ctx, treeX + 4, treeY - 14, 14, 8, "#27ae60");
    }
  }, [drawPixelRect]);

  // Draw chasing wave
  const drawWave = useCallback((ctx: CanvasRenderingContext2D, width: number, waveY: number, time: number) => {
    if (waveY > ctx.canvas.height + 50) return;
    
    // Main wave body
    const gradient = ctx.createLinearGradient(0, waveY - 80, 0, waveY + 30);
    gradient.addColorStop(0, COLORS.waveLight);
    gradient.addColorStop(0.5, COLORS.wave);
    gradient.addColorStop(1, COLORS.water1);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, waveY + 30);
    
    // Wavy top edge
    for (let x = 0; x <= width; x += 10) {
      const waveHeight = Math.sin((x + time * 3) * 0.05) * 15 + Math.sin((x + time * 5) * 0.08) * 8;
      ctx.lineTo(x, waveY - 50 + waveHeight);
    }
    
    ctx.lineTo(width, waveY + 100);
    ctx.lineTo(0, waveY + 100);
    ctx.closePath();
    ctx.fill();

    // Foam on top
    ctx.fillStyle = COLORS.foam;
    for (let x = 0; x < width; x += 15) {
      const foamY = waveY - 55 + Math.sin((x + time * 3) * 0.05) * 15;
      const foamSize = 8 + Math.sin((x + time * 2) * 0.1) * 3;
      ctx.beginPath();
      ctx.arc(x + 7, foamY, foamSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spray particles
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let i = 0; i < 8; i++) {
      const sprayX = Math.sin(time * 0.1 + i * 2) * (width * 0.4) + width / 2;
      const sprayY = waveY - 70 - Math.abs(Math.sin(time * 0.15 + i)) * 30;
      drawPixelRect(ctx, sprayX, sprayY, 4, 4, "rgba(255, 255, 255, 0.8)");
    }
  }, [drawPixelRect]);

  // Draw runner
  const drawRunner = useCallback((ctx: CanvasRenderingContext2D, runner: Runner, time: number) => {
    const { x, y, width: w, height: h, isJumping, isSliding, jumpHeight } = runner;
    const drawY = y - jumpHeight;
    const drawX = x - w / 2;
    
    const runFrame = Math.floor(time * 0.2) % 4;
    const legOffset = isJumping ? 0 : Math.sin(runFrame * Math.PI / 2) * 4;
    
    if (isSliding) {
      // Sliding pose
      drawPixelRect(ctx, drawX - 5, drawY + h - 20, w + 10, 18, COLORS.shirt);
      drawPixelRect(ctx, drawX + w - 5, drawY + h - 25, 20, 12, COLORS.runner);
      drawPixelRect(ctx, drawX - 10, drawY + h - 8, 25, 8, COLORS.shorts);
    } else {
      // Running pose
      // Legs (animated)
      drawPixelRect(ctx, drawX + 8, drawY + h - 25 + legOffset, 10, 22, COLORS.shorts);
      drawPixelRect(ctx, drawX + w - 18, drawY + h - 25 - legOffset, 10, 22, COLORS.shorts);
      
      // Feet
      drawPixelRect(ctx, drawX + 6, drawY + h - 5, 14, 6, "#5d4e37");
      drawPixelRect(ctx, drawX + w - 20, drawY + h - 5, 14, 6, "#5d4e37");
      
      // Body
      drawPixelRect(ctx, drawX + 6, drawY + 18, w - 12, 28, COLORS.shirt);
      
      // Arms (animated opposite to legs)
      const armOffset = isJumping ? -8 : -legOffset;
      drawPixelRect(ctx, drawX - 6, drawY + 22 + armOffset, 10, 6, COLORS.runner);
      drawPixelRect(ctx, drawX + w - 4, drawY + 22 - armOffset, 10, 6, COLORS.runner);
      
      // Head
      drawPixelRect(ctx, drawX + 8, drawY + 2, 24, 20, COLORS.runner);
      
      // Hair
      drawPixelRect(ctx, drawX + 8, drawY, 24, 8, "#5d4e37");
      
      // Eyes
      drawPixelRect(ctx, drawX + 12, drawY + 10, 4, 4, "#333");
      drawPixelRect(ctx, drawX + 24, drawY + 10, 4, 4, "#333");
    }

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    const shadowScale = 1 - jumpHeight / 100;
    ctx.beginPath();
    ctx.ellipse(x, y + h / 2 + 5, (w / 2) * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }, [drawPixelRect]);

  // Draw obstacles
  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle, time: number) => {
    const { x, y, width: w, height: h, type } = obstacle;
    
    if (type === "crate") {
      // Wooden crate
      drawPixelRect(ctx, x, y, w, h, COLORS.crate);
      drawPixelRect(ctx, x + 4, y + 4, w - 8, 4, COLORS.crateLight);
      drawPixelRect(ctx, x + 4, y + h - 8, w - 8, 4, COLORS.crateLight);
      // Cross pattern
      ctx.strokeStyle = COLORS.crateLight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y);
      ctx.lineTo(x, y + h);
      ctx.stroke();
    } else if (type === "barrier") {
      // Warning barrier
      drawPixelRect(ctx, x, y, w, h, COLORS.barrier);
      // Stripes
      for (let i = 0; i < 4; i++) {
        drawPixelRect(ctx, x + i * (w / 4), y + (i % 2) * (h / 2), w / 4, h / 2, COLORS.barrierStripe);
      }
    } else if (type === "bird") {
      // Flying bird (higher obstacle)
      const flapOffset = Math.sin(time * 0.2) * 6;
      drawPixelRect(ctx, x + w * 0.3, y + h * 0.4, w * 0.4, h * 0.3, "#ecf0f1");
      drawPixelRect(ctx, x, y + h * 0.3 - flapOffset, w * 0.35, h * 0.2, "#bdc3c7");
      drawPixelRect(ctx, x + w * 0.65, y + h * 0.3 + flapOffset, w * 0.35, h * 0.2, "#bdc3c7");
      drawPixelRect(ctx, x + w * 0.7, y + h * 0.35, 10, 6, "#f39c12");
    } else if (type === "coin") {
      // Collectible coin
      ctx.fillStyle = COLORS.sun;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.sunGlow;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [drawPixelRect]);

  // Check collision
  const checkCollision = useCallback((runner: Runner, obstacle: Obstacle): boolean => {
    if (obstacle.type === "coin") return false; // Coins don't cause game over
    
    const padding = runner.isSliding ? 12 : 10;
    const runnerTop = runner.y - runner.jumpHeight - runner.height / 2;
    const runnerBottom = runner.y - runner.jumpHeight + runner.height / 2;
    const runnerLeft = runner.x - runner.width / 2;
    const runnerRight = runner.x + runner.width / 2;
    
    // Birds can be slid under
    if (obstacle.type === "bird" && runner.isSliding) {
      return false;
    }
    
    // Ground obstacles can be jumped over
    if ((obstacle.type === "crate" || obstacle.type === "barrier") && runner.jumpHeight > 40) {
      return false;
    }
    
    return (
      runnerRight - padding > obstacle.x &&
      runnerLeft + padding < obstacle.x + obstacle.width &&
      runnerBottom - padding > obstacle.y &&
      runnerTop + padding < obstacle.y + obstacle.height
    );
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const gameLoop = () => {
      frameCountRef.current++;
      const time = frameCountRef.current;

      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      drawBackground(ctx, canvasSize.width, canvasSize.height, time);

      // Update runner
      const runner = runnerRef.current;
      
      // Lane switching
      const targetX = getLaneX(runner.targetLane, canvasSize.width);
      const dx = targetX - runner.x;
      runner.x += dx * LANE_SWITCH_SPEED;
      
      // Jumping
      if (runner.isJumping) {
        runner.jumpVelocity += GRAVITY;
        runner.jumpHeight -= runner.jumpVelocity;
        
        if (runner.jumpHeight <= 0) {
          runner.jumpHeight = 0;
          runner.isJumping = false;
          runner.jumpVelocity = 0;
        }
      }

      // Spawn obstacles
      const shouldSpawn = Math.random() < OBSTACLE_SPAWN_RATE;
      const hasEnoughGap = lastObstacleYRef.current < -MIN_OBSTACLE_GAP;
      
      if (shouldSpawn && hasEnoughGap) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const laneX = getLaneX(lane, canvasSize.width);
        const types: ("crate" | "barrier" | "bird")[] = ["crate", "crate", "barrier", "bird"];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let obstacleHeight = 40;
        let obstacleWidth = 40;
        let yOffset = canvasSize.height * 0.25;
        
        if (type === "bird") {
          obstacleWidth = 50;
          obstacleHeight = 30;
          yOffset = canvasSize.height * 0.4;
        } else if (type === "barrier") {
          obstacleWidth = 50;
          obstacleHeight = 35;
        }
        
        obstaclesRef.current.push({
          x: laneX - obstacleWidth / 2,
          y: -obstacleHeight,
          width: obstacleWidth,
          height: obstacleHeight,
          type,
          lane,
          passed: false,
        });
        
        lastObstacleYRef.current = 0;
      }

      // Update wave position (chasing)
      waveYRef.current -= 0.3;
      if (waveYRef.current < canvasSize.height + 50) {
        waveYRef.current = canvasSize.height + 50 + Math.sin(time * 0.01) * 20;
      }

      // Update obstacles
      lastObstacleYRef.current -= gameSpeedRef.current;
      
      obstaclesRef.current = obstaclesRef.current.filter((obstacle) => {
        obstacle.y += gameSpeedRef.current;

        if (!obstacle.passed && obstacle.y > runner.y) {
          obstacle.passed = true;
          scoreRef.current += obstacle.type === "coin" ? 50 : 10;
          if (scoreRef.current % 100 === 0) {
            playSound("score");
          }
        }

        if (checkCollision(runner, obstacle)) {
          playSound("hit");
          setGameState((prev) => {
            const newHighScore = Math.max(prev.highScore, scoreRef.current);
            localStorage.setItem("surfRunner2HighScore", newHighScore.toString());
            return {
              ...prev,
              isPlaying: false,
              isGameOver: true,
              score: scoreRef.current,
              highScore: newHighScore,
            };
          });
          return false;
        }

        drawObstacle(ctx, obstacle, time);

        return obstacle.y < canvasSize.height + 100;
      });

      // Draw wave
      drawWave(ctx, canvasSize.width, waveYRef.current, time);

      // Draw runner
      drawRunner(ctx, runner, time);

      // Update game speed
      gameSpeedRef.current += GAME_SPEED_INCREMENT;

      setGameState((prev) => ({ ...prev, score: scoreRef.current }));

      // Draw UI
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.font = "bold 16px monospace";
      ctx.strokeText(`SCORE: ${scoreRef.current}`, 10, 25);
      ctx.fillText(`SCORE: ${scoreRef.current}`, 10, 25);

      // Warning when wave is close
      if (waveYRef.current < canvasSize.height + 150) {
        ctx.fillStyle = COLORS.barrier;
        ctx.font = "bold 14px monospace";
        const warning = "⚠ WAVE APPROACHING!";
        ctx.fillText(warning, canvasSize.width / 2 - 70, canvasSize.height - 20);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, canvasSize, drawBackground, drawRunner, drawObstacle, drawWave, checkCollision, playSound, getLaneX]);

  // Draw idle state
  useEffect(() => {
    if (gameState.isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const drawIdleState = (time: number) => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      drawBackground(ctx, canvasSize.width, canvasSize.height, time);

      // Draw idle runner
      const idleRunner: Runner = {
        x: getLaneX(1, canvasSize.width),
        y: canvasSize.height - 150,
        targetLane: 1,
        currentLane: 1,
        width: 40,
        height: 60,
        isJumping: false,
        jumpVelocity: 0,
        jumpHeight: 0,
        isSliding: false,
      };
      drawRunner(ctx, idleRunner, time);

      // Draw wave in background
      drawWave(ctx, canvasSize.width, canvasSize.height + 30 + Math.sin(time * 0.02) * 10, time);

      // Overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(canvasSize.width / 2 - 140, canvasSize.height / 2 - 80, 280, 160);
      
      ctx.strokeStyle = COLORS.sun;
      ctx.lineWidth = 3;
      ctx.strokeRect(canvasSize.width / 2 - 140, canvasSize.height / 2 - 80, 280, 160);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";

      if (gameState.isGameOver) {
        ctx.fillStyle = COLORS.sky1;
        ctx.fillText("GAME OVER!", canvasSize.width / 2, canvasSize.height / 2 - 40);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(`Score: ${gameState.score}`, canvasSize.width / 2, canvasSize.height / 2 - 10);
        ctx.fillText("Press SPACE to Retry", canvasSize.width / 2, canvasSize.height / 2 + 50);
      } else {
        ctx.fillStyle = COLORS.sun;
        ctx.fillText("SURF RUNNER 2", canvasSize.width / 2, canvasSize.height / 2 - 45);
        ctx.fillStyle = COLORS.foam;
        ctx.font = "12px monospace";
        ctx.fillText("ESCAPE THE WAVE!", canvasSize.width / 2, canvasSize.height / 2 - 25);
        ctx.fillStyle = "#fff";
        ctx.font = "13px monospace";
        ctx.fillText("←/→: Switch Lanes", canvasSize.width / 2, canvasSize.height / 2 + 5);
        ctx.fillText("↑/SPACE: Jump", canvasSize.width / 2, canvasSize.height / 2 + 25);
        ctx.fillText("↓: Slide", canvasSize.width / 2, canvasSize.height / 2 + 45);
        ctx.font = "14px monospace";
        ctx.fillText("Press SPACE to Start", canvasSize.width / 2, canvasSize.height / 2 + 70);
      }
      ctx.textAlign = "left";
    };

    let animationId: number;
    let time = 0;
    
    const animate = () => {
      time++;
      drawIdleState(time);
      animationId = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameState.isPlaying, gameState.isGameOver, gameState.score, canvasSize, drawBackground, drawRunner, drawWave, getLaneX]);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border-2 border-blue-500/30" style={{ maxWidth: "450px" }}>
        {/* Game Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-2 text-white">
            <Gamepad2 className="h-5 w-5" />
            <span className="font-bold text-sm md:text-base tracking-wide">SURF RUNNER 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-white text-sm bg-black/20 px-2 py-1 rounded">
              <Trophy className="h-4 w-4 text-yellow-300" />
              <span className="font-mono">{gameState.highScore}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {gameState.isGameOver && (
              <Button
                variant="ghost"
                size="icon"
                onClick={startGame}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full cursor-pointer touch-none"
          style={{ display: "block", imageRendering: "pixelated" }}
        />

        {/* Mobile Controls Info */}
        <div className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-center text-xs text-muted-foreground md:hidden">
          Swipe ←→: Move • Swipe ↑: Jump • Swipe ↓: Slide
        </div>
      </div>
    </div>
  );
};

export default SurfRunner2;
