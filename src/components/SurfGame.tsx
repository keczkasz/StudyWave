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
  y: number;
  targetY: number;
  width: number;
  height: number;
  lane: number; // 0 = top, 1 = middle, 2 = bottom
  isDucking: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "rock" | "seagull" | "barrel";
  lane: number;
  passed: boolean;
}

// Low-poly color palette - sunset surf vibes
const COLORS = {
  sky1: "#ff6b35",      // Warm orange
  sky2: "#f7931e",      // Golden orange
  sky3: "#ffb347",      // Peach
  sky4: "#87ceeb",      // Light blue at horizon
  water1: "#1a5276",    // Deep teal
  water2: "#2980b9",    // Ocean blue
  water3: "#5dade2",    // Light ocean
  foam: "#ecf0f1",      // White foam
  sun: "#fff176",       // Bright yellow
  sunGlow: "#ffcc02",   // Sun glow
  rock: "#5d4e37",      // Brown rock
  rockLight: "#8b7355", // Light rock
  surfer: "#ffd5b4",    // Skin
  board: "#e74c3c",     // Red board
  boardStripe: "#f39c12", // Yellow stripe
  shirt: "#3498db",     // Blue shirt
  shorts: "#27ae60",    // Green shorts
};

const GAME_SPEED_INITIAL = 6;
const GAME_SPEED_INCREMENT = 0.002;
const OBSTACLE_SPAWN_RATE = 0.008; // Lower spawn rate for easier gameplay
const MIN_OBSTACLE_GAP = 180; // Minimum gap between obstacles
const LANE_COUNT = 3;
const MOVE_SPEED = 8;

const SurfGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>();
  const lastObstacleXRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem("surfGameHighScore") || "0"),
  });
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 300 });
  
  const surferRef = useRef<Surfer>({
    x: 100,
    y: 150,
    targetY: 150,
    width: 36,
    height: 50,
    lane: 1,
    isDucking: false,
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const gameSpeedRef = useRef(GAME_SPEED_INITIAL);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());

  // Get lane Y position
  const getLaneY = useCallback((lane: number, height: number) => {
    const laneHeight = height / LANE_COUNT;
    return laneHeight * lane + laneHeight / 2;
  }, []);

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const isMobile = window.innerWidth < 768;
        const width = Math.min(containerWidth - 16, 900);
        const height = isMobile ? Math.min(240, window.innerHeight * 0.3) : 300;
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const centerY = getLaneY(1, canvasSize.height);
    surferRef.current = {
      x: 100,
      y: centerY,
      targetY: centerY,
      width: 36,
      height: 50,
      lane: 1,
      isDucking: false,
    };
    obstaclesRef.current = [];
    gameSpeedRef.current = GAME_SPEED_INITIAL;
    scoreRef.current = 0;
    frameCountRef.current = 0;
    lastObstacleXRef.current = canvasSize.width + 200;
  }, [canvasSize.height, canvasSize.width, getLaneY]);

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
  const playSound = useCallback((type: "jump" | "hit" | "score") => {
    if (!soundEnabled) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === "jump") {
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.08);
      } else if (type === "hit") {
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      } else if (type === "score") {
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
      }
    } catch {
      // Audio context not available
    }
  }, [soundEnabled]);

  // Handle movement
  const moveUp = useCallback(() => {
    const surfer = surferRef.current;
    if (surfer.lane > 0) {
      surfer.lane--;
      surfer.targetY = getLaneY(surfer.lane, canvasSize.height);
      playSound("jump");
    }
  }, [canvasSize.height, getLaneY, playSound]);

  const moveDown = useCallback(() => {
    const surfer = surferRef.current;
    if (surfer.lane < LANE_COUNT - 1) {
      surfer.lane++;
      surfer.targetY = getLaneY(surfer.lane, canvasSize.height);
      playSound("jump");
    }
  }, [canvasSize.height, getLaneY, playSound]);

  const setDucking = useCallback((isDucking: boolean) => {
    surferRef.current.isDucking = isDucking;
    if (isDucking) {
      surferRef.current.height = 30;
    } else {
      surferRef.current.height = 50;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      
      if (!gameState.isPlaying) {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === "ArrowUp") {
        e.preventDefault();
        moveUp();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        if (!surferRef.current.isDucking) {
          moveDown();
        }
        setDucking(true);
      } else if (e.code === "Space") {
        e.preventDefault();
        moveUp();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      if (e.code === "ArrowDown") {
        setDucking(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState.isPlaying, moveUp, moveDown, setDucking, startGame]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      
      if (!gameState.isPlaying) {
        startGame();
        return;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!gameState.isPlaying) return;
      
      const touchCurrentY = e.touches[0].clientY;
      const deltaY = touchCurrentY - touchStartY;
      
      if (Math.abs(deltaY) > 20) {
        if (deltaY < 0) {
          moveUp();
        } else {
          moveDown();
          setDucking(true);
        }
        touchStartY = touchCurrentY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setDucking(false);
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gameState.isPlaying, moveUp, moveDown, setDucking, startGame]);

  // Draw pixelated rectangle helper
  const drawPixelRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }, []);

  // Draw low-poly background
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // Sky gradient - sunset colors
    const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    gradient.addColorStop(0, COLORS.sky1);
    gradient.addColorStop(0.3, COLORS.sky2);
    gradient.addColorStop(0.6, COLORS.sky3);
    gradient.addColorStop(1, COLORS.sky4);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height * 0.5);

    // Pixelated sun
    const sunX = width - 100;
    const sunY = 50;
    ctx.fillStyle = COLORS.sunGlow;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 0.001;
      const rayLength = 45 + Math.sin(time * 0.02 + i) * 5;
      ctx.fillRect(
        sunX + Math.cos(angle) * 30 - 3,
        sunY + Math.sin(angle) * 30 - 3,
        6,
        rayLength - 25
      );
    }
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();

    // Ocean - layered waves
    const waterTop = height * 0.35;
    
    // Back wave layer
    ctx.fillStyle = COLORS.water1;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 20) {
      const y = waterTop + 20 + Math.sin((x + time * 1.5) * 0.015) * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Middle wave layer
    ctx.fillStyle = COLORS.water2;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 15) {
      const y = waterTop + 40 + Math.sin((x + time * 2) * 0.02) * 12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Front wave layer
    ctx.fillStyle = COLORS.water3;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 10) {
      const y = waterTop + 60 + Math.sin((x + time * 2.5) * 0.025) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Foam lines
    ctx.strokeStyle = COLORS.foam;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 12]);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y = waterTop + 30 + i * 40 + Math.sin((x + time * (2 + i * 0.3)) * 0.02) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Lane indicators (subtle)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    for (let i = 1; i < LANE_COUNT; i++) {
      const laneY = (height / LANE_COUNT) * i;
      ctx.beginPath();
      ctx.moveTo(0, laneY);
      ctx.lineTo(width, laneY);
      ctx.stroke();
    }
  }, []);

  // Draw low-poly surfer
  const drawSurfer = useCallback((ctx: CanvasRenderingContext2D, surfer: Surfer, time: number) => {
    const { x, y, width: w, height: h, isDucking } = surfer;
    const bobOffset = Math.sin(time * 0.08) * 3;
    const drawY = y + bobOffset - h / 2;
    
    // Surfboard - pixelated
    const boardY = drawY + (isDucking ? h - 8 : h - 10);
    drawPixelRect(ctx, x - 8, boardY, w + 16, 8, COLORS.board);
    drawPixelRect(ctx, x, boardY + 2, w, 4, COLORS.boardStripe);
    
    if (isDucking) {
      // Ducking pose - compact
      // Body crouched
      drawPixelRect(ctx, x + 4, drawY + h - 25, w - 8, 18, COLORS.shirt);
      // Head down
      drawPixelRect(ctx, x + 8, drawY + h - 35, 20, 14, COLORS.surfer);
      // Arms forward
      drawPixelRect(ctx, x - 6, drawY + h - 20, 12, 6, COLORS.surfer);
      drawPixelRect(ctx, x + w - 6, drawY + h - 20, 12, 6, COLORS.surfer);
    } else {
      // Standing pose
      // Legs
      drawPixelRect(ctx, x + 8, drawY + h - 22, 8, 18, COLORS.shorts);
      drawPixelRect(ctx, x + w - 16, drawY + h - 22, 8, 18, COLORS.shorts);
      // Torso
      drawPixelRect(ctx, x + 6, drawY + 20, w - 12, 24, COLORS.shirt);
      // Arms
      const armWave = Math.sin(time * 0.1) * 4;
      drawPixelRect(ctx, x - 4, drawY + 22 + armWave, 10, 6, COLORS.surfer);
      drawPixelRect(ctx, x + w - 6, drawY + 22 - armWave, 10, 6, COLORS.surfer);
      // Head
      drawPixelRect(ctx, x + 8, drawY + 4, 20, 18, COLORS.surfer);
      // Hair
      drawPixelRect(ctx, x + 8, drawY + 2, 20, 8, "#5d4e37");
      // Eyes
      drawPixelRect(ctx, x + 22, drawY + 10, 4, 4, "#333");
    }
  }, [drawPixelRect]);

  // Draw rock obstacle (low-poly)
  const drawRock = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    const { x, y, width: w, height: h } = obstacle;
    
    // Main rock shape - angular/pixelated
    ctx.fillStyle = COLORS.rock;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.15, y + h * 0.4);
    ctx.lineTo(x + w * 0.4, y);
    ctx.lineTo(x + w * 0.7, y + h * 0.2);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = COLORS.rockLight;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.lineTo(x + w * 0.4, y + h * 0.15);
    ctx.lineTo(x + w * 0.55, y + h * 0.35);
    ctx.closePath();
    ctx.fill();

    // Water splash
    ctx.fillStyle = COLORS.foam;
    drawPixelRect(ctx, x - 4, y + h - 4, 8, 6);
    drawPixelRect(ctx, x + w - 4, y + h - 4, 8, 6);
  }, [drawPixelRect]);

  // Draw seagull obstacle (low-poly)
  const drawSeagull = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle, time: number) => {
    const { x, y, width: w, height: h } = obstacle;
    const flapOffset = Math.sin(time * 0.15) * 8;
    
    // Body
    ctx.fillStyle = "#ecf0f1";
    drawPixelRect(ctx, x + w * 0.3, y + h * 0.4, w * 0.4, h * 0.3);
    
    // Wings
    ctx.fillStyle = "#bdc3c7";
    // Left wing
    drawPixelRect(ctx, x, y + h * 0.3 - flapOffset, w * 0.35, h * 0.2);
    // Right wing
    drawPixelRect(ctx, x + w * 0.65, y + h * 0.3 + flapOffset, w * 0.35, h * 0.2);
    
    // Head
    ctx.fillStyle = "#ecf0f1";
    drawPixelRect(ctx, x + w * 0.6, y + h * 0.25, w * 0.2, h * 0.2);
    
    // Beak
    ctx.fillStyle = "#f39c12";
    drawPixelRect(ctx, x + w * 0.75, y + h * 0.32, w * 0.15, h * 0.1);
    
    // Eye
    ctx.fillStyle = "#2c3e50";
    drawPixelRect(ctx, x + w * 0.65, y + h * 0.3, 3, 3);
  }, [drawPixelRect]);

  // Draw barrel obstacle (bonus obstacle type)
  const drawBarrel = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    const { x, y, width: w, height: h } = obstacle;
    
    // Barrel body
    ctx.fillStyle = "#8b4513";
    drawPixelRect(ctx, x + 4, y + 4, w - 8, h - 8);
    
    // Metal bands
    ctx.fillStyle = "#5d6d7e";
    drawPixelRect(ctx, x, y + h * 0.2, w, 6);
    drawPixelRect(ctx, x, y + h * 0.7, w, 6);
    
    // Highlight
    ctx.fillStyle = "#a0522d";
    drawPixelRect(ctx, x + w * 0.3, y + 8, w * 0.15, h - 16);
  }, [drawPixelRect]);

  // Check collision
  const checkCollision = useCallback((surfer: Surfer, obstacle: Obstacle): boolean => {
    const padding = surfer.isDucking ? 15 : 12;
    const surferTop = surfer.y - surfer.height / 2;
    const surferBottom = surfer.y + surfer.height / 2;
    const surferLeft = surfer.x;
    const surferRight = surfer.x + surfer.width;
    
    const obstacleTop = obstacle.y;
    const obstacleBottom = obstacle.y + obstacle.height;
    const obstacleLeft = obstacle.x;
    const obstacleRight = obstacle.x + obstacle.width;
    
    // Seagulls can be ducked under
    if (obstacle.type === "seagull" && surfer.isDucking) {
      return false;
    }
    
    return (
      surferRight - padding > obstacleLeft &&
      surferLeft + padding < obstacleRight &&
      surferBottom - padding > obstacleTop &&
      surferTop + padding < obstacleBottom
    );
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Disable image smoothing for pixel art effect
    ctx.imageSmoothingEnabled = false;

    const gameLoop = () => {
      frameCountRef.current++;
      const time = frameCountRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw background
      drawBackground(ctx, canvasSize.width, canvasSize.height, time);

      // Update surfer position (smooth movement to target lane)
      const surfer = surferRef.current;
      const dy = surfer.targetY - surfer.y;
      surfer.y += dy * 0.15;

      // Draw surfer
      drawSurfer(ctx, surfer, time);

      // Spawn obstacles with better spacing
      const shouldSpawn = Math.random() < OBSTACLE_SPAWN_RATE;
      const hasEnoughGap = lastObstacleXRef.current > canvasSize.width + MIN_OBSTACLE_GAP;
      
      if (shouldSpawn && hasEnoughGap) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const laneY = getLaneY(lane, canvasSize.height);
        const types: ("rock" | "seagull" | "barrel")[] = ["rock", "rock", "seagull", "barrel"];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let obstacleHeight = 35;
        let obstacleWidth = 35;
        let yOffset = 0;
        
        if (type === "seagull") {
          obstacleWidth = 45;
          obstacleHeight = 25;
          yOffset = -15;
        } else if (type === "barrel") {
          obstacleWidth = 30;
          obstacleHeight = 35;
        }
        
        obstaclesRef.current.push({
          x: canvasSize.width + 50,
          y: laneY - obstacleHeight / 2 + yOffset,
          width: obstacleWidth,
          height: obstacleHeight,
          type,
          lane,
          passed: false,
        });
        
        lastObstacleXRef.current = canvasSize.width + 50;
      }

      // Update obstacles
      lastObstacleXRef.current -= gameSpeedRef.current;
      
      obstaclesRef.current = obstaclesRef.current.filter((obstacle) => {
        obstacle.x -= gameSpeedRef.current;

        // Check if passed
        if (!obstacle.passed && obstacle.x + obstacle.width < surfer.x) {
          obstacle.passed = true;
          scoreRef.current += 10;
          if (scoreRef.current % 100 === 0) {
            playSound("score");
          }
        }

        // Check collision
        if (checkCollision(surfer, obstacle)) {
          playSound("hit");
          setGameState((prev) => {
            const newHighScore = Math.max(prev.highScore, scoreRef.current);
            localStorage.setItem("surfGameHighScore", newHighScore.toString());
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

        // Draw obstacle
        if (obstacle.type === "rock") {
          drawRock(ctx, obstacle);
        } else if (obstacle.type === "seagull") {
          drawSeagull(ctx, obstacle, time);
        } else {
          drawBarrel(ctx, obstacle);
        }

        return obstacle.x > -100;
      });

      // Update game speed (accelerate over time)
      gameSpeedRef.current += GAME_SPEED_INCREMENT;

      // Update score display
      setGameState((prev) => ({ ...prev, score: scoreRef.current }));

      // Draw score (pixelated style)
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.font = "bold 18px monospace";
      ctx.strokeText(`SCORE: ${scoreRef.current}`, 12, 28);
      ctx.fillText(`SCORE: ${scoreRef.current}`, 12, 28);
      
      // Speed indicator
      const speed = Math.floor(gameSpeedRef.current * 10);
      ctx.strokeText(`SPEED: ${speed}`, 12, 50);
      ctx.fillText(`SPEED: ${speed}`, 12, 50);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, canvasSize, drawBackground, drawSurfer, drawRock, drawSeagull, drawBarrel, checkCollision, playSound, getLaneY]);

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

      // Draw idle surfer in center
      const idleSurfer: Surfer = {
        x: 100,
        y: canvasSize.height / 2,
        targetY: canvasSize.height / 2,
        width: 36,
        height: 50,
        lane: 1,
        isDucking: false,
      };
      drawSurfer(ctx, idleSurfer, time);

      // Draw overlay box
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(canvasSize.width / 2 - 150, canvasSize.height / 2 - 55, 300, 110);
      
      // Border
      ctx.strokeStyle = COLORS.sun;
      ctx.lineWidth = 3;
      ctx.strokeRect(canvasSize.width / 2 - 150, canvasSize.height / 2 - 55, 300, 110);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";

      if (gameState.isGameOver) {
        ctx.fillStyle = COLORS.sky1;
        ctx.fillText("GAME OVER!", canvasSize.width / 2, canvasSize.height / 2 - 20);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(`Score: ${gameState.score}`, canvasSize.width / 2, canvasSize.height / 2 + 5);
        ctx.fillText("Press SPACE to Retry", canvasSize.width / 2, canvasSize.height / 2 + 35);
      } else {
        ctx.fillStyle = COLORS.sun;
        ctx.fillText("SURF RUNNER", canvasSize.width / 2, canvasSize.height / 2 - 20);
        ctx.fillStyle = "#fff";
        ctx.font = "14px monospace";
        ctx.fillText("↑/↓: Move • HOLD ↓: Duck", canvasSize.width / 2, canvasSize.height / 2 + 8);
        ctx.fillText("Press SPACE to Start", canvasSize.width / 2, canvasSize.height / 2 + 35);
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
  }, [gameState.isPlaying, gameState.isGameOver, gameState.score, canvasSize, drawBackground, drawSurfer]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border-2 border-orange-500/30">
        {/* Game Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500">
          <div className="flex items-center gap-2 text-white">
            <Gamepad2 className="h-5 w-5" />
            <span className="font-bold text-sm md:text-base tracking-wide">SURF RUNNER</span>
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
        <div className="px-4 py-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-center text-xs text-muted-foreground md:hidden">
          Swipe ↑↓ to move • Hold down to duck
        </div>
      </div>
    </div>
  );
};

export default SurfGame;
