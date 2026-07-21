import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Zap, Thermometer, User, Eye, EyeOff } from 'lucide-react';
import { SwarmState, Player, Nanobot, Threat, PlayerState, EngineMetrics } from '../types';
import { synth } from '../lib/synth';

interface VectorCanvasProps {
  engineMetrics: EngineMetrics;
  setEngineMetrics: React.Dispatch<React.SetStateAction<EngineMetrics>>;
  swarmState: SwarmState;
  setSwarmState: (state: SwarmState) => void;
  willpowerActive: boolean;
  setWillpowerActive: (active: boolean) => void;
  onTargetTriggered: (freq: number) => void;
}

export default function VectorCanvas({
  engineMetrics,
  setEngineMetrics,
  swarmState,
  setSwarmState,
  willpowerActive,
  setWillpowerActive,
  onTargetTriggered,
}: VectorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Core Game State
  const [player, setPlayer] = useState<Player>({
    x: 200,
    y: 250,
    vx: 0,
    vy: 0,
    health: 100,
    willpower: 100,
    stealthSignature: 10,
    state: PlayerState.Sneaking,
    score: 0,
    isAlive: true,
  });

  const [threats, setThreats] = useState<Threat[]>([]);
  const [interactiveTerminals, setInteractiveTerminals] = useState<Array<{ x: number; y: number; id: string; active: boolean; freq: number }>>([
    { x: 100, y: 150, id: 'TERM_A01', active: true, freq: 1.8 },
    { x: 450, y: 220, id: 'TERM_B24', active: true, freq: 3.2 },
    { x: 280, y: 80, id: 'TERM_C42', active: true, freq: 4.5 },
  ]);

  // Keep references to values needed inside the high-frequency animation loop
  const playerRef = useRef<Player>(player);
  const threatsRef = useRef<Threat[]>(threats);
  const terminalsRef = useRef<Array<{ x: number; y: number; id: string; active: boolean; freq: number }>>(interactiveTerminals);
  const swarmStateRef = useRef<SwarmState>(swarmState);
  const willpowerActiveRef = useRef<boolean>(willpowerActive);
  const temperatureRef = useRef<number>(engineMetrics.temperature);
  const nanobotsRef = useRef<Nanobot[]>([]);

  // Update references when state changes
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { threatsRef.current = threats; }, [threats]);
  useEffect(() => { terminalsRef.current = interactiveTerminals; }, [interactiveTerminals]);
  useEffect(() => { swarmStateRef.current = swarmState; }, [swarmState]);
  useEffect(() => { willpowerActiveRef.current = willpowerActive; }, [willpowerActive]);
  useEffect(() => { temperatureRef.current = engineMetrics.temperature; }, [engineMetrics.temperature]);

  // Handle keys pressed
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Mobile Swipe controller state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Nanobots once
  useEffect(() => {
    const bots: Nanobot[] = [];
    // Spawn up to 800 bots (controlled by temperature scaling)
    for (let i = 0; i < 800; i++) {
      bots.push({
        id: i,
        x: Math.random() * 600,
        y: Math.random() * 400,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        noiseOffset: Math.random() * 100,
        frequency: 1 + Math.random() * 4,
        color: 'cyan',
      });
    }
    nanobotsRef.current = bots;
  }, []);

  // Set up game loop
  useEffect(() => {
    // Keyboard inputs
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = true;

      // Swipe / Action mapping on keyboard
      if (e.key === ' ' || k === 'spacebar') {
        e.preventDefault();
        // Toggle or Hold Willpower override
        const activeTerminal = getNearbyTerminal();
        if (activeTerminal) {
          setWillpowerActive(true);
          onTargetTriggered(activeTerminal.freq);
          synth.playTick(800, 0.08, 0.2);
        } else {
          setWillpowerActive(true);
          synth.playTick(500, 0.05, 0.15);
        }
      }

      // Jump / Dodge Trigger (W / Up Arrow)
      if (e.key === 'ArrowUp' || k === 'w') {
        if (playerRef.current.state !== PlayerState.Jumping) {
          setPlayer(p => ({ ...p, state: PlayerState.Jumping, vy: -6 }));
          synth.playMove();
        }
      }
      // Slide / Crouch Trigger (S / Down Arrow)
      if (e.key === 'ArrowDown' || k === 's') {
        if (playerRef.current.state !== PlayerState.Sliding) {
          setPlayer(p => ({ ...p, state: PlayerState.Sliding }));
          synth.playMove();
          setTimeout(() => {
            setPlayer(p => ({ ...p, state: PlayerState.Sneaking }));
          }, 600);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = false;

      if (e.key === ' ' || k === 'spacebar') {
        setWillpowerActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Dynamic Threat Spawning Timer
    const threatTimer = setInterval(() => {
      if (!playerRef.current.isAlive) return;

      // Spawn a threat vector warning line
      const id = Math.random().toString(36).substring(2, 9);
      const isVertical = Math.random() > 0.5;
      
      let startX = 0, startY = 0, endX = 0, endY = 0;
      if (isVertical) {
        startX = Math.random() * 550 + 20;
        startY = 0;
        endX = startX + (Math.random() - 0.5) * 80;
        endY = 400;
      } else {
        startX = 0;
        startY = Math.random() * 350 + 20;
        endX = 600;
        endY = startY + (Math.random() - 0.5) * 80;
      }

      const newThreat: Threat = {
        id,
        startX,
        startY,
        endX,
        endY,
        progress: 0,
        speed: 0.015 + Math.random() * 0.015,
        color: 'rgb(244, 63, 94)', // Red threat
        isActive: true,
        type: Math.random() > 0.5 ? 'laser' : 'spike',
        width: 3,
      };

      setThreats(prev => [...prev.filter(t => t.isActive), newThreat]);
      synth.playThreatWarning();
    }, 4500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(threatTimer);
    };
  }, [onTargetTriggered]);

  const getNearbyTerminal = () => {
    const p = playerRef.current;
    return terminalsRef.current.find(t => {
      const dist = Math.hypot(t.x - p.x, t.y - p.y);
      return dist < 45 && t.active;
    });
  };

  // Touch handlers for mobile Joystick / Swipes simulation
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    // Detect gestures (Swipe)
    if (Math.abs(diffY) > 40) {
      if (diffY < 0) {
        // Swipe Up -> Jump
        if (playerRef.current.state !== PlayerState.Jumping) {
          setPlayer(p => ({ ...p, state: PlayerState.Jumping, vy: -6 }));
          synth.playMove();
        }
      } else {
        // Swipe Down -> Slide/Crouch
        if (playerRef.current.state !== PlayerState.Sliding) {
          setPlayer(p => ({ ...p, state: PlayerState.Sliding }));
          synth.playMove();
          setTimeout(() => {
            setPlayer(p => ({ ...p, state: PlayerState.Sneaking }));
          }, 600);
        }
      }
      touchStartRef.current = null;
    } else if (Math.abs(diffX) > 40) {
      // Horizontal dodge
      setPlayer(p => ({ ...p, x: Math.max(20, Math.min(580, p.x + (diffX > 0 ? 30 : -30))) }));
      synth.playMove();
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Main rendering & physics engine loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;

    const gameLoop = (now: number) => {
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      // Calculate FPS
      frameCount++;
      fpsTimer += deltaTime;
      if (fpsTimer >= 1.0) {
        setEngineMetrics(m => ({
          ...m,
          fps: frameCount,
          activeBots: nanobotsRef.current.length,
        }));
        frameCount = 0;
        fpsTimer = 0;
      }

      // 1. Thermal Throttling mitigation logic (Phase 5)
      const currentTemp = temperatureRef.current;
      let targetBotCount = 800;
      let mathematicalDetail: 'High' | 'Medium' | 'Low' = 'High';
      let renderLevel = 1;

      if (currentTemp >= 46) {
        targetBotCount = 200; // Drastic reduction
        mathematicalDetail = 'Low';
        renderLevel = 3; // Elite retro lines
      } else if (currentTemp >= 41) {
        targetBotCount = 450;
        mathematicalDetail = 'Medium';
        renderLevel = 2;
      }

      // Smoothly update dynamic engine metrics
      setEngineMetrics(m => ({
        ...m,
        cpuLoad: Math.round(30 + (targetBotCount / 10) + (currentTemp * 0.4)),
        gpuLoad: Math.round(25 + (targetBotCount / 12) + (currentTemp * 0.5)),
        renderComplexity: mathematicalDetail === 'High' ? 'High' : (mathematicalDetail === 'Medium' ? 'Medium' : 'Low' as any),
      }));

      // Adjust active boids to match target threshold (Dynamic quality scaler)
      if (nanobotsRef.current.length !== targetBotCount) {
        if (nanobotsRef.current.length < targetBotCount) {
          // Add bots
          const diff = targetBotCount - nanobotsRef.current.length;
          for (let i = 0; i < diff; i++) {
            nanobotsRef.current.push({
              id: Math.random(),
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              noiseOffset: Math.random() * 100,
              frequency: 1 + Math.random() * 4,
              color: 'cyan',
            });
          }
        } else {
          // Remove excess bots
          nanobotsRef.current = nanobotsRef.current.slice(0, targetBotCount);
        }
      }

      // Clear Screen (Cyber twilight theme canvas background)
      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- PHASE 3: Deterministic Level Grid (Mathematical streaming dunes / hallways) ---
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.08)';
      ctx.lineWidth = 1;
      const t = now * 0.001;

      // Draw mathematical moving grid (Dunes perspective)
      const gridDetail = renderLevel === 1 ? 20 : (renderLevel === 2 ? 35 : 60); // NES scaling
      for (let y = 100; y < canvas.height; y += gridDetail) {
        // Add waving motion via Perlin approximation (Simplex style)
        const waveY = y + Math.sin(t * 1.5 + y * 0.02) * 12 * (y / canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, waveY);
        ctx.lineTo(canvas.width, waveY);
        ctx.stroke();
      }
      for (let x = 0; x < canvas.width; x += gridDetail) {
        ctx.beginPath();
        // Vertical pillars warping with time variable
        const waveX = x + Math.cos(t * 1.0 + x * 0.015) * 15;
        ctx.moveTo(waveX, 0);
        ctx.lineTo(waveX, canvas.height);
        ctx.stroke();
      }

      // Draw horizontal platform lattices (climbable vectors)
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.35)';
      ctx.lineWidth = 2;
      // Static structural platforms
      const platforms = [
        { x1: 50, y: 180, x2: 250 },
        { x1: 350, y: 250, x2: 550 },
        { x1: 150, y: 320, x2: 450 },
      ];
      platforms.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y);
        ctx.lineTo(p.x2, p.y);
        ctx.stroke();

        // Draw structural vertical lines supporting the lattice
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.12)';
        for (let l = p.x1 + 10; l < p.x2; l += 30) {
          ctx.beginPath();
          ctx.moveTo(l, p.y);
          ctx.lineTo(l, p.y + 12);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.35)';
      });

      // --- PHASE 4: Cognitive Signature Stealth & Player Physics ---
      let p = playerRef.current;
      if (p.isAlive) {
        // Player inputs logic
        let moving = false;
        let vx = 0;
        let vy = p.vy;

        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          vx = -2.4;
          moving = true;
        }
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          vx = 2.4;
          moving = true;
        }

        // Apply simple physics/gravity
        vy += 0.2; // Gravity
        let px = p.x + vx;
        let py = p.y + vy;

        // Platform collision checks
        let onPlatform = false;
        platforms.forEach(plat => {
          if (px >= plat.x1 - 10 && px <= plat.x2 + 10) {
            // Check landing
            if (p.y <= plat.y && py >= plat.y) {
              py = plat.y;
              vy = 0;
              onPlatform = true;
            }
          }
        });

        // Arena boundary limits
        if (px < 20) px = 20;
        if (px > canvas.width - 20) px = canvas.width - 20;
        if (py > canvas.height - 30) {
          py = canvas.height - 30;
          vy = 0;
          onPlatform = true;
        }
        if (py < 20) py = 20;

        // Set state metrics
        let signature = 10;
        let currentState = PlayerState.Sneaking;

        if (moving) {
          currentState = PlayerState.Running;
          signature = 45;
        }
        if (p.state === PlayerState.Jumping) {
          currentState = PlayerState.Jumping;
          signature = 85;
          if (onPlatform) {
            currentState = PlayerState.Sneaking;
          }
        }
        if (p.state === PlayerState.Sliding) {
          currentState = PlayerState.Sliding;
          signature = 90;
        }
        if (willpowerActiveRef.current) {
          signature = Math.min(100, signature + 35);
        }

        // Slow recovery of willpower
        let wp = p.willpower;
        if (willpowerActiveRef.current) {
          wp = Math.max(0, wp - 0.4);
          if (wp <= 0) {
            setWillpowerActive(false);
          }
        } else {
          wp = Math.min(100, wp + 0.15);
        }

        // Apply update to Player state
        setPlayer(prev => ({
          ...prev,
          x: px,
          y: py,
          vy,
          state: currentState,
          stealthSignature: Math.round(signature),
          willpower: wp,
        }));

        // Draw Player: Holographic Vector Model (Triangle node inside resonance rings)
        ctx.shadowBlur = renderLevel === 3 ? 0 : 8;
        ctx.shadowColor = 'rgba(0, 255, 65, 0.8)';
        ctx.strokeStyle = 'rgb(0, 255, 65)';
        ctx.lineWidth = 2.5;

        // Pulsing stealth range circle
        ctx.beginPath();
        ctx.arc(px, py, 20 + signature * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 65, ${0.05 + (signature / 400)})`;
        ctx.stroke();

        // Main Player Avatar (Vector wireframe node)
        ctx.strokeStyle = 'rgb(0, 255, 65)';
        ctx.beginPath();
        if (currentState === PlayerState.Sliding) {
          // Slide box
          ctx.moveTo(px - 14, py);
          ctx.lineTo(px + 14, py);
          ctx.lineTo(px + 10, py - 8);
          ctx.lineTo(px - 10, py - 8);
          ctx.closePath();
        } else {
          // Null Node triangle standing
          ctx.moveTo(px, py - 16);
          ctx.lineTo(px - 10, py + 4);
          ctx.lineTo(px + 10, py + 4);
          ctx.closePath();
        }
        ctx.stroke();

        // Eye core node
        ctx.fillStyle = 'rgb(220, 255, 230)';
        ctx.beginPath();
        ctx.arc(px, py - 4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Render "Interactive Terminal Node" rings
        terminalsRef.current.forEach(term => {
          if (!term.active) {
            // Inverted/Rebooted terminal glows peaceful emerald
            ctx.shadowColor = 'rgba(0, 255, 65, 0.8)';
            ctx.strokeStyle = 'rgb(0, 255, 65)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(term.x, term.y, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgb(0, 255, 65)';
            ctx.font = '8px monospace';
            ctx.fillText('SECURE', term.x - 14, term.y - 18);
            return;
          }

          // Distressed active terminal
          const distToPlayer = Math.hypot(term.x - px, term.y - py);
          const canInteract = distToPlayer < 45;

          ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
          ctx.strokeStyle = canInteract ? 'rgb(253, 224, 71)' : 'rgb(6, 182, 212)';
          ctx.lineWidth = canInteract ? 2 : 1;

          // Double glowing vector ring
          ctx.beginPath();
          ctx.arc(term.x, term.y, 14 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(term.x, term.y, 8, 0, Math.PI * 2);
          ctx.stroke();

          // Text marker
          ctx.fillStyle = canInteract ? 'rgb(253, 224, 71)' : 'rgb(6, 182, 212)';
          ctx.font = '9px monospace';
          ctx.fillText(canInteract ? '[TAP SPACE / WILLPOWER]' : term.id, term.x - 45, term.y - 20);
        });
      }

      // --- PHASE 4: Threat Vectors & Laser Traps ---
      threatsRef.current.forEach(threat => {
        if (!threat.isActive) return;

        // Progress charging threat
        threat.progress += threat.speed;
        if (threat.progress >= 1.0) {
          threat.isActive = false;

          // Check if player collided with threat at impact frame
          if (p.isAlive) {
            const hit = checkLineCollision(p.x, p.y, threat.startX, threat.startY, threat.endX, threat.endY, 20);
            if (hit) {
              synth.playDamage();
              // One-hit death or heavy depletion
              setPlayer(prev => {
                const health = Math.max(0, prev.health - 50);
                return {
                  ...prev,
                  health,
                  isAlive: health > 0,
                };
              });
            }
          }
          return;
        }

        // Draw Warning Vector Line (Red)
        ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
        ctx.shadowBlur = renderLevel === 3 ? 0 : 10;
        ctx.strokeStyle = `rgba(244, 63, 94, ${0.25 + threat.progress * 0.75})`;
        ctx.lineWidth = threat.progress > 0.8 ? 5 : 2;

        ctx.beginPath();
        ctx.moveTo(threat.startX, threat.startY);
        ctx.lineTo(threat.endX, threat.endY);
        ctx.stroke();

        // Draw Charge indicator text / symbols
        if (threat.progress < 0.8) {
          ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
          ctx.font = '9px monospace';
          ctx.fillText(`▲ WARNING: THREAT IMPACT ${(100 - threat.progress * 100).toFixed(0)}ms`, threat.startX + 10, threat.startY + 20);
        }
      });

      // --- PHASE 2: Nanobot Swarm Flocking (Boids Algorithm) ---
      const activeSwarmState = swarmStateRef.current;
      const wpActive = willpowerActiveRef.current;

      nanobotsRef.current.forEach(bot => {
        // Adjust bot behavior state based on collective system
        let targetX = p.x;
        let targetY = p.y;

        // If player is Sneaking, boids don't seek unless very close
        const distanceToPlayer = Math.hypot(bot.x - p.x, bot.y - p.y);
        const detectsPlayer = p.isAlive && (distanceToPlayer < (60 + p.stealthSignature * 2.2));

        let currentBehavior = SwarmState.Dormant;
        if (activeSwarmState === SwarmState.Dissolving) {
          currentBehavior = SwarmState.Dissolving;
        } else if (wpActive) {
          currentBehavior = SwarmState.Constructive;
          // Flocking to help construct
          targetX = p.x;
          targetY = p.y + 35 + Math.sin(bot.noiseOffset) * 10;
        } else if (detectsPlayer) {
          currentBehavior = SwarmState.Aggressive;
          targetX = p.x;
          targetY = p.y;
        }

        // Flocking boids vectors
        let flockCenterX = 0;
        let flockCenterY = 0;
        let separationX = 0;
        let separationY = 0;
        let count = 0;

        // To keep performance high on mobile CPU simulations, only inspect subset of neighbors
        const sampleLimit = renderLevel === 1 ? 25 : (renderLevel === 2 ? 15 : 6);
        for (let i = 0; i < sampleLimit; i++) {
          const other = nanobotsRef.current[(bot.id + i) % nanobotsRef.current.length];
          if (!other || other.id === bot.id) continue;

          const dist = Math.hypot(bot.x - other.x, bot.y - other.y);
          if (dist < 40) {
            flockCenterX += other.x;
            flockCenterY += other.y;
            count++;

            if (dist < 12) {
              separationX -= (other.x - bot.x);
              separationY -= (other.y - bot.y);
            }
          }
        }

        if (count > 0) {
          flockCenterX /= count;
          flockCenterY /= count;
          // Pull towards swarm center (cohesion)
          bot.vx += (flockCenterX - bot.x) * 0.005;
          bot.vy += (flockCenterY - bot.y) * 0.005;
        }

        // Add separation forces to prevent stacking
        bot.vx += separationX * 0.06;
        bot.vy += separationY * 0.06;

        // Swarm state micro-logic
        if (currentBehavior === SwarmState.Aggressive) {
          // Attracted to player node
          const dx = targetX - bot.x;
          const dy = targetY - bot.y;
          const dist = Math.hypot(dx, dy);
          bot.vx += (dx / dist) * 0.12;
          bot.vy += (dy / dist) * 0.12;
          bot.color = 'rgb(244, 63, 94)'; // Threat red

          // Collide with player damage check
          if (p.isAlive && dist < 15) {
            setPlayer(prev => {
              const hp = Math.max(0, prev.health - 0.25);
              if (hp <= 0 && prev.isAlive) {
                synth.playDamage();
                return { ...prev, health: 0, isAlive: false };
              }
              return { ...prev, health: hp };
            });
          }
        } else if (currentBehavior === SwarmState.Constructive) {
          // Orbiting player as glowing energy shield
          const dx = targetX - bot.x;
          const dy = targetY - bot.y;
          const dist = Math.hypot(dx, dy);
          bot.vx += (dx / dist) * 0.2;
          bot.vy += (dy / dist) * 0.2;
          bot.color = 'rgb(253, 224, 71)'; // Golden shielding
        } else if (currentBehavior === SwarmState.Dissolving) {
          // Float away and die
          bot.vx += (Math.random() - 0.5) * 0.1;
          bot.vy -= 0.12; // float upwards
          bot.color = 'rgb(168, 85, 247)'; // purple dissolving
        } else {
          // Dormant / Idle (Flocking peacefully)
          bot.vx += (Math.sin(t + bot.noiseOffset) * 0.06);
          bot.vy += (Math.cos(t + bot.noiseOffset) * 0.06);
          bot.color = 'rgb(6, 182, 212)'; // Cyan standard
        }

        // Clamp velocity
        const speed = Math.hypot(bot.vx, bot.vy);
        const maxSpeed = currentBehavior === SwarmState.Aggressive ? 3.5 : 1.8;
        if (speed > maxSpeed) {
          bot.vx = (bot.vx / speed) * maxSpeed;
          bot.vy = (bot.vy / speed) * maxSpeed;
        }

        // Update position
        bot.x += bot.vx;
        bot.y += bot.vy;

        // Screen bounding wrap
        if (bot.x < 0) bot.x = canvas.width;
        if (bot.x > canvas.width) bot.x = 0;
        if (bot.y < 0) bot.y = canvas.height;
        if (bot.y > canvas.height) bot.y = 0;

        // Render Bot (Tiny crisp glowing vectors/pixels)
        ctx.fillStyle = bot.color;
        ctx.shadowColor = bot.color;
        ctx.shadowBlur = renderLevel === 3 ? 0 : 5;

        // Draw bot as small custom vector lines (v-shape for swarm direction)
        ctx.beginPath();
        const angle = Math.atan2(bot.vy, bot.vx);
        ctx.moveTo(bot.x + Math.cos(angle) * 4, bot.y + Math.sin(angle) * 4);
        ctx.lineTo(bot.x + Math.cos(angle + 2.5) * 3, bot.y + Math.sin(angle + 2.5) * 3);
        ctx.lineTo(bot.x + Math.cos(angle - 2.5) * 3, bot.y + Math.sin(angle - 2.5) * 3);
        ctx.closePath();
        ctx.fill();
      });

      // Reset shadows
      ctx.shadowBlur = 0;

      // Draw score and diagnostics HUD directly on canvas edges for atmospheric layout
      ctx.fillStyle = 'rgba(0, 255, 65, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`VECTOR ENGINE FRAME: ${(now * 0.06).toFixed(0)}`, 15, 25);
      ctx.fillText(`ACTIVE SWARM COUNT: ${nanobotsRef.current.length} entity`, 15, 38);
      ctx.fillText(`OCTREE STREAM: IN RANGE [OK]`, canvas.width - 180, 25);
      ctx.fillText(`COGNITIVE SENSORS: ONLINE`, canvas.width - 180, 38);

      animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [setEngineMetrics, setSwarmState, setWillpowerActive]);

  // Helper calculation for laser line collision
  const checkLineCollision = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    threshold: number
  ) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dist = Math.hypot(px - xx, py - yy);
    return dist < threshold;
  };

  const handleRestart = () => {
    setPlayer({
      x: 200,
      y: 250,
      vx: 0,
      vy: 0,
      health: 100,
      willpower: 100,
      stealthSignature: 10,
      state: PlayerState.Sneaking,
      score: player.score,
      isAlive: true,
    });
    setThreats([]);
    setInteractiveTerminals(prev => prev.map(t => ({ ...t, active: true })));
    setSwarmState(SwarmState.Dormant);
    setWillpowerActive(false);
    synth.playSuccess();
  };

  return (
    <div ref={containerRef} className="relative flex flex-col items-center bg-[#030303]/95 p-2 rounded-xl border border-[#00FF41]/20 glow-border-green">
      {/* HUD Header */}
      <div className="w-full flex justify-between items-center px-4 py-2 border-b border-[#00FF41]/10 text-xs font-mono text-[#00FF41]">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#00FF41]" />
          <span>PROTAGONIST: <span className="font-bold text-white uppercase tracking-wider glow-text-green">NULL NODE</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Thermometer className="w-4 h-4 text-rose-500" />
            TEMP: <span className={engineMetrics.temperature > 42 ? 'text-rose-500 animate-pulse font-bold glow-text-red' : 'text-[#00FF41] font-bold'}>{engineMetrics.temperature}°C</span>
          </span>
          <span className="bg-[#00FF41]/10 px-2 py-0.5 rounded text-[#00FF41] border border-[#00FF41]/20 font-bold">
            60FPS COMPUTE ACTIVE
          </span>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative w-full overflow-hidden my-2">
        <canvas
          id="vector-game-canvas"
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full bg-[#030303] border border-[#00FF41]/20 rounded-lg cursor-crosshair touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Tactical HUD overlays */}
        {!player.isAlive && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center font-mono p-6 border border-rose-500/30 rounded-lg">
            <AlertTriangle className="w-16 h-16 text-rose-500 animate-bounce mb-3" />
            <h3 className="text-xl font-bold text-rose-400 tracking-wider text-center glow-text-red">HARMONIC COGNITIVE DESYNCHRONIZATION</h3>
            <p className="text-xs text-slate-400 max-w-md text-center mt-2 mb-6 leading-relaxed">
              Biological signature detected and absorbed by swarm. Internal nanobots triggered resonance collapse. Reboot core to realign willpower tuning.
            </p>
            <button
              id="reboot-btn"
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-950/60 border border-rose-500 text-rose-200 hover:bg-rose-500 hover:text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            >
              <RotateCcw className="w-4 h-4" />
              INJECT REBOOT SIGNAL
            </button>
          </div>
        )}

        {/* Vector Controls Overlay (Visible for touch exploration/simulated joysticks) */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between items-end font-mono">
          {/* Virtual Joystick display */}
          <div className="flex flex-col gap-1 p-2 bg-black/90 rounded border border-[#00FF41]/20 backdrop-blur text-[10px] text-[#00FF41]">
            <span className="font-bold border-b border-[#00FF41]/10 pb-0.5 mb-1 text-white">TOUCH CONTROLS</span>
            <div>Swipe UP: Jump / Climb Lattice</div>
            <div>Swipe DOWN: Slide / Crouch</div>
            <div>Swipe L/R: Vector Dodge Dash</div>
          </div>

          {/* Quick interactive test buttons */}
          <div className="pointer-events-auto flex gap-2">
            <button
              id="dodge-left-btn"
              onClick={() => {
                setPlayer(p => ({ ...p, x: Math.max(20, p.x - 45) }));
                synth.playMove();
              }}
              className="px-2 py-1 text-[10px] bg-[#00FF41]/10 border border-[#00FF41]/20 hover:bg-[#00FF41]/20 text-[#00FF41] rounded"
            >
              ◀ DODGE L
            </button>
            <button
              id="jump-btn"
              onClick={() => {
                if (player.state !== PlayerState.Jumping) {
                  setPlayer(p => ({ ...p, state: PlayerState.Jumping, vy: -6 }));
                  synth.playMove();
                }
              }}
              className="px-2 py-1 text-[10px] bg-[#00FF41]/10 border border-[#00FF41]/20 hover:bg-[#00FF41]/20 text-[#00FF41] rounded"
            >
              ▲ JUMP
            </button>
            <button
              id="dodge-right-btn"
              onClick={() => {
                setPlayer(p => ({ ...p, x: Math.min(580, p.x + 45) }));
                synth.playMove();
              }}
              className="px-2 py-1 text-[10px] bg-[#00FF41]/10 border border-[#00FF41]/20 hover:bg-[#00FF41]/20 text-[#00FF41] rounded"
            >
              DODGE R ▶
            </button>
          </div>
        </div>
      </div>

      {/* Active player stats and signature HUD */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-black/60 rounded-lg border border-[#00FF41]/10 font-mono text-xs">
        {/* Vital Health */}
        <div className="flex flex-col gap-1 border-r border-[#00FF41]/10 pr-3">
          <div className="flex justify-between">
            <span className="text-slate-400">BIOLOGICAL INTEGRITY</span>
            <span className={player.health < 35 ? 'text-rose-400 font-bold animate-pulse glow-text-red' : 'text-[#00FF41] font-bold glow-text-green'}>
              {player.health.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-black border border-[#00FF41]/15 rounded h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${player.health < 35 ? 'bg-rose-600 shadow-[0_0_8px_#dc2626]' : 'bg-[#00FF41] shadow-[0_0_8px_#00FF41]'}`}
              style={{ width: `${player.health}%` }}
            />
          </div>
        </div>

        {/* Cognitive signature level */}
        <div className="flex flex-col gap-1 border-r border-[#00FF41]/10 px-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1">
              {player.stealthSignature > 50 ? <Eye className="w-3.5 h-3.5 text-rose-500" /> : <EyeOff className="w-3.5 h-3.5 text-[#00FF41]" />}
              SIGNATURE COGNITIVE DB
            </span>
            <span className={player.stealthSignature > 50 ? 'text-rose-400 font-bold animate-pulse glow-text-red' : 'text-[#00FF41] font-bold glow-text-green'}>
              {player.stealthSignature}dB
            </span>
          </div>
          <div className="w-full bg-black border border-[#00FF41]/15 rounded h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${player.stealthSignature > 50 ? 'bg-rose-600 shadow-[0_0_8px_#dc2626]' : 'bg-[#00FF41] shadow-[0_0_8px_#00FF41]'}`}
              style={{ width: `${player.stealthSignature}%` }}
            />
          </div>
        </div>

        {/* Willpower energy */}
        <div className="flex flex-col gap-1 pl-3">
          <div className="flex justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#00FF41]" />
              WILLPOWER RESONANCE
            </span>
            <span className="text-[#00FF41] font-bold glow-text-green">{player.willpower.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-black border border-[#00FF41]/15 rounded h-2.5 overflow-hidden">
            <div
              className="h-full bg-[#00FF41] shadow-[0_0_8px_#00FF41] transition-all duration-100"
              style={{ width: `${player.willpower}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
