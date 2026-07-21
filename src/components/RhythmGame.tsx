import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Radio, ShieldAlert } from 'lucide-react';
import { synth } from '../lib/synth';

interface RhythmGameProps {
  onSuccess: () => void;
  onFailure: () => void;
  targetFrequency: number; // Swarm frequency (e.g., 1.5 - 4.5 Hz)
  isActive: boolean;
}

export default function RhythmGame({
  onSuccess,
  onFailure,
  targetFrequency,
  isActive,
}: RhythmGameProps) {
  const [playerFrequency, setPlayerFrequency] = useState<number>(1.0);
  const [syncPercentage, setSyncPercentage] = useState<number>(0);
  const [harmonicLocked, setHarmonicLocked] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Synchronize player controls
  useEffect(() => {
    if (!isActive) {
      setSyncPercentage(0);
      setHarmonicLocked(false);
      synth.stopWillpowerResonance();
      return;
    }

    synth.startWillpowerResonance(playerFrequency * 200);

    // Dynamic keyboard controls (Arrow keys or A/D to tune the frequency)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setPlayerFrequency(prev => Math.min(prev + 0.1, 5.0));
        synth.playTick(400 + playerFrequency * 100, 0.02, 0.1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setPlayerFrequency(prev => Math.max(prev - 0.1, 0.5));
        synth.playTick(400 + playerFrequency * 100, 0.02, 0.1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      synth.stopWillpowerResonance();
    };
  }, [isActive, playerFrequency]);

  // Handle continuous audio tuning
  useEffect(() => {
    if (isActive) {
      const volume = 0.1 + (syncPercentage / 100) * 0.4;
      // Play a combination of player frequency + target sync
      synth.updateWillpowerResonance(playerFrequency * 220, volume);
    }
  }, [playerFrequency, syncPercentage, isActive]);

  // Main canvas animation loop to render waves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      timeRef.current += 0.05;
      const t = timeRef.current;

      // Draw Grid lines (Vector calibration grid)
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      for (let i = 0; i < h; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
      }

      // Draw baseline axis
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Check current delta between player and target frequencies
      const freqDelta = Math.abs(playerFrequency - targetFrequency);
      const isAligned = freqDelta < 0.15;

      // Draw Target Frequency Wave (Cyan - Collective Nanobot Swarm Signal)
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
      ctx.strokeStyle = 'rgb(6, 182, 212)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        // Form complex wave: combination of targetFrequency and some static noise
        const amplitude = h * 0.28 * Math.sin(x * 0.01 * targetFrequency + t);
        const noise = isAligned ? 0 : Math.sin(x * 0.08 + t * 4) * 2;
        if (x === 0) {
          ctx.moveTo(x, h / 2 + amplitude + noise);
        } else {
          ctx.lineTo(x, h / 2 + amplitude + noise);
        }
      }
      ctx.stroke();

      // Draw Player Willpower Tuning Wave (Neon Green - Null Node Frequency)
      ctx.shadowColor = 'rgba(0, 255, 65, 0.9)';
      ctx.strokeStyle = 'rgb(0, 255, 65)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const amplitude = h * 0.28 * Math.sin(x * 0.01 * playerFrequency - t);
        if (x === 0) {
          ctx.moveTo(x, h / 2 + amplitude);
        } else {
          ctx.lineTo(x, h / 2 + amplitude);
        }
      }
      ctx.stroke();

      // Draw Interference/Overlap points (glow indicator)
      if (isAligned) {
        ctx.shadowColor = 'rgba(253, 224, 71, 0.9)';
        ctx.strokeStyle = 'rgb(253, 224, 71)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < w; x += 15) {
          const yTarget = h / 2 + h * 0.28 * Math.sin(x * 0.01 * targetFrequency + t);
          const yPlayer = h / 2 + h * 0.28 * Math.sin(x * 0.01 * playerFrequency - t);
          ctx.beginPath();
          ctx.arc(x, (yTarget + yPlayer) / 2, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(253, 224, 71, 0.7)';
          ctx.fill();
        }
      }

      // Reset shadows
      ctx.shadowBlur = 0;

      // Update sync and locks
      if (isActive) {
        if (isAligned) {
          setSyncPercentage(prev => {
            const next = Math.min(prev + 1.25, 100);
            if (next >= 100 && !harmonicLocked) {
              setHarmonicLocked(true);
              synth.playSuccess();
              onSuccess();
            }
            return next;
          });
        } else {
          setSyncPercentage(prev => Math.max(prev - 0.75, 0));
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerFrequency, targetFrequency, isActive, harmonicLocked, onSuccess]);

  if (!isActive) return null;

  const freqDelta = Math.abs(playerFrequency - targetFrequency);
  const isAligned = freqDelta < 0.15;

  return (
    <div id="rhythm-override-panel" className="border-2 border-[#00FF41]/40 bg-black/95 p-4 rounded-xl flex flex-col gap-3 font-mono glow-border-green">
      <div className="flex items-center justify-between border-b border-[#00FF41]/20 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#00FF41] animate-pulse" />
          <span className="text-sm font-bold text-[#00FF41] glow-text-green">COGNITIVE TUNING FORK OVERRIDE</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/25">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>HARMONIC LOCK STATUS: {isAligned ? 'RESONANT' : 'DISTORTED'}</span>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={450}
          height={150}
          className="w-full bg-black/80 rounded border border-[#00FF41]/20"
        />
        {/* Alignment Guidance HUD overlay */}
        <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1 text-[10px] text-[#00FF41] bg-[#030303]/90 p-1.5 rounded border border-[#00FF41]/20">
          <div>TARGET FREQ : <span className="text-cyan-400 font-bold">{targetFrequency.toFixed(2)} Hz</span></div>
          <div>PLAYER FREQ : <span className="text-[#00FF41] font-bold">{playerFrequency.toFixed(2)} Hz</span></div>
          <div>DIFFERENTIAL: <span className={isAligned ? 'text-[#00FF41] font-bold animate-pulse glow-text-green' : 'text-rose-400'}>{freqDelta.toFixed(2)} Hz</span></div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Tuning Dial (Adjust frequency to align waves)</span>
          <span className="text-[#00FF41] font-bold">{playerFrequency.toFixed(2)} Hz / 5.00 Hz</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="freq-down"
            className="px-2.5 py-1 text-xs border border-[#00FF41]/30 hover:bg-[#00FF41]/20 active:bg-[#00FF41]/40 text-[#00FF41] rounded transition-colors"
            onClick={() => {
              setPlayerFrequency(f => Math.max(f - 0.2, 0.5));
              synth.playTick(300, 0.02, 0.1);
            }}
          >
            ◀ FINE -
          </button>
          
          <input
            id="willpower-slider"
            type="range"
            min="0.5"
            max="5.0"
            step="0.05"
            value={playerFrequency}
            onChange={(e) => setPlayerFrequency(parseFloat(e.target.value))}
            className="flex-1 accent-[#00FF41] cursor-pointer bg-slate-900 rounded-lg appearance-none h-1.5 border border-[#00FF41]/20"
          />

          <button
            id="freq-up"
            className="px-2.5 py-1 text-xs border border-[#00FF41]/30 hover:bg-[#00FF41]/20 active:bg-[#00FF41]/40 text-[#00FF41] rounded transition-colors"
            onClick={() => {
              setPlayerFrequency(f => Math.min(f + 0.2, 5.0));
              synth.playTick(600, 0.02, 0.1);
            }}
          >
            + FINE ▶
          </button>
        </div>
        <div className="text-[10px] text-slate-500 text-center mt-0.5">
          Tip: You can also use <kbd className="bg-black border border-slate-800 px-1 py-0.5 rounded text-slate-300">A</kbd> / <kbd className="bg-black border border-slate-800 px-1 py-0.5 rounded text-slate-300">D</kbd> or <kbd className="bg-black border border-slate-800 px-1 py-0.5 rounded text-slate-300">◀</kbd> / <kbd className="bg-black border border-slate-800 px-1 py-0.5 rounded text-slate-300">▶</kbd> on your keyboard.
        </div>
      </div>

      {/* Sync progress meter */}
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Harmonic System Sync:</span>
          <span className={`font-bold ${syncPercentage > 75 ? 'text-[#00FF41] animate-pulse glow-text-green' : 'text-[#00FF41]'}`}>
            {syncPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-black border border-[#00FF41]/20 rounded h-3 overflow-hidden p-[2px]">
          <div
            className="bg-[#00FF41] h-full rounded shadow-[0_0_10px_#00FF41] transition-all duration-75"
            style={{ width: `${syncPercentage}%` }}
          />
        </div>
        {syncPercentage > 0 && !isAligned && (
          <div className="text-[10px] text-rose-400 flex items-center gap-1.5 mt-0.5 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            <span>WARNING: Signal drift detected. Readjust alignment to avoid core desynchronization!</span>
          </div>
        )}
      </div>
    </div>
  );
}
