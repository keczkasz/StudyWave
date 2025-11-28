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
  baseY: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
  isDucking: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "rock" | "seagull";
  passed: boolean;
}

interface Wave {
  x: number;
  amplitude: number;
  frequency: number;
  speed: number;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const GAME_SPEED_INITIAL = 5;
const GAME_SPEED_INCREMENT = 0.001;
const OBSTACLE_SPAWN_RATE = 0.015;

const SurfGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem("surfGameHighScore") || "0"),
  });
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 300 });
  
  const surferRef = useRef<Surfer>({
    x: 80,
    y: 200,
    baseY: 200,
    width: 40,
    height: 60,
    velocityY: 0,
    isJumping: false,
    isDucking: false,
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const wavesRef = useRef<Wave[]>([]);
  const gameSpeedRef = useRef(GAME_SPEED_INITIAL);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const isMobile = window.innerWidth < 768;
        const width = Math.min(containerWidth - 16, 900);
        const height = isMobile ? Math.min(220, window.innerHeight * 0.25) : 280;
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Initialize waves
  const initializeWaves = useCallback(() => {
    wavesRef.current = [
      { x: 0, amplitude: 8, frequency: 0.02, speed: 2 },
      { x: 50, amplitude: 6, frequency: 0.015, speed: 1.5 },
      { x: 100, amplitude: 10, frequency: 0.025, speed: 2.5 },
    ];
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const baseY = canvasSize.height - 80;
    surferRef.current = {
      x: 80,
      y: baseY,
      baseY: baseY,
      width: 40,
      height: 60,
      velocityY: 0,
      isJumping: false,
      isDucking: false,
    };
    obstaclesRef.current = [];
    gameSpeedRef.current = GAME_SPEED_INITIAL;
    scoreRef.current = 0;
    frameCountRef.current = 0;
    initializeWaves();
  }, [canvasSize.height, initializeWaves]);

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

  // Handle jump
  const jump = useCallback(() => {
    const surfer = surferRef.current;
    if (!surfer.isJumping && !surfer.isDucking) {
      surfer.velocityY = JUMP_FORCE;
      surfer.isJumping = true;
      if (soundEnabled) {
        playSound("jump");
      }
    }
  }, [soundEnabled, playSound]);

  // Handle duck
  const duck = useCallback((isDucking: boolean) => {
    const surfer = surferRef.current;
    if (!surfer.isJumping) {
      surfer.isDucking = isDucking;
      surfer.height = isDucking ? 35 : 60;
      if (isDucking) {
        surfer.y = surfer.baseY + 25;
      } else {
        surfer.y = surfer.baseY;
      }
    }
  }, []);

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
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } else if (type === "hit") {
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      } else if (type === "score") {
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (e) {
      // Audio context not available
    }
  }, [soundEnabled]);

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

      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        duck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") {
        duck(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState.isPlaying, jump, duck, startGame]);

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
      
      jump();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!gameState.isPlaying) return;
      
      const touchCurrentY = e.touches[0].clientY;
      const deltaY = touchCurrentY - touchStartY;
      
      if (deltaY > 30) {
        duck(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      duck(false);
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gameState.isPlaying, jump, duck, startGame]);

  // Draw surfer
  const drawSurfer = useCallback((ctx: CanvasRenderingContext2D, surfer: Surfer, time: number) => {
    ctx.save();
    
    // Add wave motion when not jumping
    const waveOffset = surfer.isJumping ? 0 : Math.sin(time * 0.005) * 3;
    const drawY = surfer.y + waveOffset;
    
    // Surfboard
    ctx.fillStyle = "#f4a460";
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 2;
    
    const boardWidth = surfer.width + 20;
    const boardHeight = 8;
    const boardY = drawY + surfer.height - 5;
    
    ctx.beginPath();
    ctx.ellipse(surfer.x + surfer.width / 2, boardY, boardWidth / 2, boardHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Board stripe
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.ellipse(surfer.x + surfer.width / 2, boardY, boardWidth / 3, boardHeight / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    const bodyHeight = surfer.isDucking ? surfer.height * 0.6 : surfer.height * 0.7;
    const bodyY = surfer.isDucking ? drawY + 15 : drawY;
    
    // Legs
    ctx.fillStyle = "#4a90d9";
    ctx.beginPath();
    ctx.roundRect(surfer.x + 8, bodyY + bodyHeight - 25, 10, 25, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(surfer.x + 22, bodyY + bodyHeight - 25, 10, 25, 3);
    ctx.fill();
    
    // Torso
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.roundRect(surfer.x + 5, bodyY + 15, 30, bodyHeight - 40, 5);
    ctx.fill();
    
    // Arms
    ctx.fillStyle = "#ffd5b4";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#ffd5b4";
    ctx.lineCap = "round";
    
    // Left arm
    ctx.beginPath();
    ctx.moveTo(surfer.x + 10, bodyY + 25);
    if (surfer.isDucking) {
      ctx.lineTo(surfer.x - 5, bodyY + 35);
    } else if (surfer.isJumping) {
      ctx.lineTo(surfer.x - 10, bodyY + 10);
    } else {
      ctx.lineTo(surfer.x - 5, bodyY + 30 + Math.sin(time * 0.01) * 5);
    }
    ctx.stroke();
    
    // Right arm
    ctx.beginPath();
    ctx.moveTo(surfer.x + 30, bodyY + 25);
    if (surfer.isDucking) {
      ctx.lineTo(surfer.x + 45, bodyY + 35);
    } else if (surfer.isJumping) {
      ctx.lineTo(surfer.x + 50, bodyY + 10);
    } else {
      ctx.lineTo(surfer.x + 45, bodyY + 30 + Math.sin(time * 0.01 + 1) * 5);
    }
    ctx.stroke();
    
    // Head
    ctx.fillStyle = "#ffd5b4";
    ctx.beginPath();
    ctx.arc(surfer.x + surfer.width / 2, bodyY + 10, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair
    ctx.fillStyle = "#4a3728";
    ctx.beginPath();
    ctx.arc(surfer.x + surfer.width / 2, bodyY + 5, 12, Math.PI, Math.PI * 2);
    ctx.fill();
    
    // Face
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(surfer.x + surfer.width / 2 + 4, bodyY + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Smile
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(surfer.x + surfer.width / 2 + 2, bodyY + 12, 4, 0, Math.PI);
    ctx.stroke();
    
    ctx.restore();
  }, []);

  // Draw rock obstacle
  const drawRock = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    ctx.save();
    
    // Main rock body
    const gradient = ctx.createLinearGradient(
      obstacle.x, obstacle.y,
      obstacle.x + obstacle.width, obstacle.y + obstacle.height
    );
    gradient.addColorStop(0, "#6b7280");
    gradient.addColorStop(0.5, "#4b5563");
    gradient.addColorStop(1, "#374151");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
    ctx.lineTo(obstacle.x + obstacle.width * 0.2, obstacle.y + obstacle.height * 0.3);
    ctx.lineTo(obstacle.x + obstacle.width * 0.5, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width * 0.8, obstacle.y + obstacle.height * 0.4);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();
    
    // Rock texture
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width * 0.3, obstacle.y + obstacle.height * 0.5);
    ctx.lineTo(obstacle.x + obstacle.width * 0.4, obstacle.y + obstacle.height * 0.7);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width * 0.6, obstacle.y + obstacle.height * 0.3);
    ctx.lineTo(obstacle.x + obstacle.width * 0.7, obstacle.y + obstacle.height * 0.6);
    ctx.stroke();
    
    // Water splash around rock
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(
      obstacle.x + obstacle.width * 0.5,
      obstacle.y + obstacle.height + 5,
      obstacle.width * 0.6,
      8,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    ctx.restore();
  }, []);

  // Draw seagull obstacle
  const drawSeagull = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle, time: number) => {
    ctx.save();
    ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    
    // Wing flap animation
    const flapAngle = Math.sin(time * 0.02) * 0.3;
    
    // Body
    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.ellipse(0, 0, obstacle.width * 0.4, obstacle.height * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Left wing
    ctx.save();
    ctx.rotate(-flapAngle);
    ctx.fillStyle = "#e5e5e5";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-obstacle.width * 0.5, -obstacle.height * 0.4, -obstacle.width * 0.6, 0);
    ctx.quadraticCurveTo(-obstacle.width * 0.4, 5, -5, 0);
    ctx.fill();
    ctx.restore();
    
    // Right wing
    ctx.save();
    ctx.rotate(flapAngle);
    ctx.fillStyle = "#e5e5e5";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.quadraticCurveTo(obstacle.width * 0.5, -obstacle.height * 0.4, obstacle.width * 0.6, 0);
    ctx.quadraticCurveTo(obstacle.width * 0.4, 5, 5, 0);
    ctx.fill();
    ctx.restore();
    
    // Head
    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.arc(obstacle.width * 0.3, -obstacle.height * 0.1, obstacle.width * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(obstacle.width * 0.4, -obstacle.height * 0.1);
    ctx.lineTo(obstacle.width * 0.55, -obstacle.height * 0.05);
    ctx.lineTo(obstacle.width * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    
    // Eye
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(obstacle.width * 0.32, -obstacle.height * 0.12, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }, []);

  // Draw water and waves
  const drawWater = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    skyGradient.addColorStop(0, "#87ceeb");
    skyGradient.addColorStop(0.5, "#98d8ea");
    skyGradient.addColorStop(1, "#b0e0e6");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.6);
    
    // Sun
    ctx.fillStyle = "#fff7b2";
    ctx.beginPath();
    ctx.arc(width - 80, 50, 35, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(width - 80, 50, 28, 0, Math.PI * 2);
    ctx.fill();
    
    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    const drawCloud = (x: number, y: number, scale: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
      ctx.arc(x + 25 * scale, y - 5 * scale, 25 * scale, 0, Math.PI * 2);
      ctx.arc(x + 50 * scale, y, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
    };
    
    drawCloud((time * 0.02) % (width + 200) - 100, 40, 1);
    drawCloud((time * 0.015 + 300) % (width + 200) - 100, 70, 0.7);
    
    // Water
    const waterY = height * 0.55;
    const waterGradient = ctx.createLinearGradient(0, waterY, 0, height);
    waterGradient.addColorStop(0, "#0077be");
    waterGradient.addColorStop(0.3, "#0066a0");
    waterGradient.addColorStop(1, "#004d7a");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, waterY, width, height - waterY);
    
    // Animated waves
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const waveY = waterY + 20 + i * 30;
      for (let x = 0; x < width; x += 5) {
        const y = waveY + Math.sin((x + time * (2 - i * 0.5)) * 0.02) * (8 - i * 2);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    // Wave foam at water line
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    for (let x = 0; x < width; x += 10) {
      const y = waterY + Math.sin((x + time * 3) * 0.03) * 5;
      ctx.arc(x, y, 4 + Math.sin((x + time) * 0.05) * 2, 0, Math.PI * 2);
    }
    ctx.fill();
  }, []);

  // Check collision
  const checkCollision = useCallback((surfer: Surfer, obstacle: Obstacle): boolean => {
    // Add some padding for more forgiving collision
    const padding = 10;
    return (
      surfer.x + padding < obstacle.x + obstacle.width &&
      surfer.x + surfer.width - padding > obstacle.x &&
      surfer.y + padding < obstacle.y + obstacle.height &&
      surfer.y + surfer.height - padding > obstacle.y
    );
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      frameCountRef.current++;
      const time = frameCountRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw background
      drawWater(ctx, canvasSize.width, canvasSize.height, time);

      // Update surfer
      const surfer = surferRef.current;
      
      if (surfer.isJumping) {
        surfer.velocityY += GRAVITY;
        surfer.y += surfer.velocityY;
        
        if (surfer.y >= surfer.baseY) {
          surfer.y = surfer.baseY;
          surfer.velocityY = 0;
          surfer.isJumping = false;
        }
      }

      // Draw surfer
      drawSurfer(ctx, surfer, time);

      // Spawn obstacles
      if (Math.random() < OBSTACLE_SPAWN_RATE * (gameSpeedRef.current / GAME_SPEED_INITIAL)) {
        const isSeagull = Math.random() > 0.5;
        const baseY = canvasSize.height - 80;
        
        if (isSeagull) {
          obstaclesRef.current.push({
            x: canvasSize.width + 50,
            y: baseY - 60 - Math.random() * 40,
            width: 50,
            height: 35,
            type: "seagull",
            passed: false,
          });
        } else {
          obstaclesRef.current.push({
            x: canvasSize.width + 50,
            y: baseY + 20,
            width: 35 + Math.random() * 20,
            height: 35 + Math.random() * 15,
            type: "rock",
            passed: false,
          });
        }
      }

      // Update and draw obstacles
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
        } else {
          drawSeagull(ctx, obstacle, time);
        }

        return obstacle.x > -100;
      });

      // Update game speed
      gameSpeedRef.current += GAME_SPEED_INCREMENT;

      // Update score display
      setGameState((prev) => ({ ...prev, score: scoreRef.current }));

      // Draw score on canvas
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 3;
      ctx.font = "bold 20px 'Outfit', sans-serif";
      ctx.strokeText(`Score: ${scoreRef.current}`, 15, 30);
      ctx.fillText(`Score: ${scoreRef.current}`, 15, 30);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, canvasSize, drawWater, drawSurfer, drawRock, drawSeagull, checkCollision, playSound]);

  // Draw idle state
  useEffect(() => {
    if (gameState.isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawIdleState = (time: number) => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      drawWater(ctx, canvasSize.width, canvasSize.height, time);

      // Draw idle surfer
      const idleSurfer: Surfer = {
        x: 80,
        y: canvasSize.height - 80,
        baseY: canvasSize.height - 80,
        width: 40,
        height: 60,
        velocityY: 0,
        isJumping: false,
        isDucking: false,
      };
      drawSurfer(ctx, idleSurfer, time);

      // Draw game over or start text
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(canvasSize.width / 2 - 140, canvasSize.height / 2 - 50, 280, 100);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px 'Outfit', sans-serif";
      ctx.textAlign = "center";

      if (gameState.isGameOver) {
        ctx.fillText("Game Over!", canvasSize.width / 2, canvasSize.height / 2 - 15);
        ctx.font = "16px 'Outfit', sans-serif";
        ctx.fillText(`Score: ${gameState.score}`, canvasSize.width / 2, canvasSize.height / 2 + 10);
        ctx.fillText("Tap or Press Space to Retry", canvasSize.width / 2, canvasSize.height / 2 + 35);
      } else {
        ctx.fillText("🏄 Surf Runner", canvasSize.width / 2, canvasSize.height / 2 - 10);
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.fillText("Tap/Space: Jump • Swipe Down/↓: Duck", canvasSize.width / 2, canvasSize.height / 2 + 15);
        ctx.fillText("Tap or Press Space to Start", canvasSize.width / 2, canvasSize.height / 2 + 35);
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
  }, [gameState.isPlaying, gameState.isGameOver, gameState.score, canvasSize, drawWater, drawSurfer]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden">
        {/* Game Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600">
          <div className="flex items-center gap-2 text-white">
            <Gamepad2 className="h-5 w-5" />
            <span className="font-semibold text-sm md:text-base">Surf Runner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-white text-sm">
              <Trophy className="h-4 w-4 text-yellow-300" />
              <span>{gameState.highScore}</span>
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
          style={{ display: "block" }}
        />

        {/* Mobile Controls Info */}
        <div className="px-4 py-2 bg-muted/50 text-center text-xs text-muted-foreground md:hidden">
          Tap to jump • Swipe down to duck
        </div>
      </div>
    </div>
  );
};

export default SurfGame;
