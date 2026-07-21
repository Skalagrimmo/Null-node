import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Cpu,
  Flame,
  Volume2,
  VolumeX,
  Play,
  Settings,
  HelpCircle,
  FileCode,
  Smartphone,
  ShieldCheck,
  Compass,
  Zap,
  Info
} from 'lucide-react';
import { SwarmState, EngineMetrics } from './types';
import VectorCanvas from './components/VectorCanvas';
import RhythmGame from './components/RhythmGame';
import CodeViewer from './components/CodeViewer';
import { SvoStreamingSimulator } from './components/SvoStreamingSimulator';
import { synth } from './lib/synth';

export default function App() {
  const [engineMetrics, setEngineMetrics] = useState<EngineMetrics>({
    fps: 60,
    temperature: 36.5, // Celsius
    activeBots: 800,
    cpuLoad: 35,
    gpuLoad: 28,
    renderComplexity: 'High',
    octreeNodes: 9,
  });

  const [swarmState, setSwarmState] = useState<SwarmState>(SwarmState.Dormant);
  const [willpowerActive, setWillpowerActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Rhythm mini-game states
  const [activeRhythmGame, setActiveRhythmGame] = useState<{
    isActive: boolean;
    targetFreq: number;
  }>({
    isActive: false,
    targetFreq: 1.8,
  });

  const [overrideSuccessCount, setOverrideSuccessCount] = useState<number>(0);
  const [messageQueue, setMessageQueue] = useState<Array<{ id: string; text: string; type: 'info' | 'warn' | 'success' }>>([
    { id: '1', text: 'BEVY ECS ENGINE BOOTED: Swarm coordinator active.', type: 'info' },
    { id: '2', text: 'WGPU RENDER PIPELINE: Screen-space AA meshlets allocated.', type: 'info' },
  ]);

  // Log message helper
  const addLog = (text: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setMessageQueue(prev => [
      { id: Math.random().toString(), text, type },
      ...prev.slice(0, 12),
    ]);
  };

  // Synchronize audio state
  useEffect(() => {
    if (!soundEnabled) {
      synth.stopWillpowerResonance();
    }
  }, [soundEnabled]);

  // Handle successful rhythm mini-game hack
  const handleRhythmSuccess = () => {
    setActiveRhythmGame(prev => ({ ...prev, isActive: false }));
    setWillpowerActive(false);
    setSwarmState(SwarmState.Dissolving);
    setOverrideSuccessCount(c => c + 1);
    addLog('HARMONIC ALIGNMENT SECURED: local nanobot frequency inverted!', 'success');
    addLog('SWARM STATE TRIGGER: DISSOLVING', 'info');

    // Return to dormant after 5 seconds
    setTimeout(() => {
      setSwarmState(SwarmState.Dormant);
      addLog('SWARM STATE TRIGGER: DORMANT', 'info');
    }, 5500);
  };

  // Handle thermal slider changes
  const handleTempChange = (newTemp: number) => {
    setEngineMetrics(prev => ({ ...prev, temperature: newTemp }));
    if (newTemp >= 46 && engineMetrics.temperature < 46) {
      addLog('WARNING: DEVICE TEMP CRITICAL (46°C+). EXECUTING THERMAL THROTTLING SAFEGUARDS.', 'warn');
      addLog('SAFEGUARD: CPU SIMULATION SUBSET DIVIDED, RENDER REDUCED TO ELITE VECTOR LINES.', 'warn');
    } else if (newTemp < 46 && engineMetrics.temperature >= 46) {
      addLog('TEMPERATURE NORMALIZED. RESTORING HIGH-FIDELITY SIMULATION COMPUTE.', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col relative overflow-hidden font-mono selection:bg-[#00FF41]/20 selection:text-[#00FF41]">
      
      {/* Immersive UI Nano-Bloom Glow Overlays */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF41] blur-[140px] rounded-full opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600 blur-[160px] rounded-full opacity-10"></div>
      </div>

      {/* Persistent Scanline Terminal overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 z-10 scanlines-overlay"></div>

      {/* Top Navigation bar */}
      <header className="border-b border-[#00FF41]/20 bg-[#030303]/90 backdrop-blur sticky top-0 z-50 px-4 md:px-8 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00FF41]/10 border border-[#00FF41]/30 flex items-center justify-center shadow-[0_0_12px_rgba(0,255,65,0.25)]">
            <Gamepad2 className="w-4.5 h-4.5 text-[#00FF41]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase glow-text-green">NULL NODE</h1>
            <p className="text-[10px] text-slate-500">Android Rust Engine & Willpower Sim</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              synth.playTick(600, 0.04, 0.1);
            }}
            className={`p-2 rounded border transition-colors ${
              soundEnabled
                ? 'bg-[#00FF41]/10 border-[#00FF41]/30 text-[#00FF41]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Web Audio Synthesizer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-[#00FF41]/20 rounded text-[10px] text-slate-400">
            <Smartphone className="w-3.5 h-3.5 text-[#00FF41] animate-pulse" />
            <span>PLATFORM: ANDROID GLES3 / VULKAN</span>
          </div>
        </div>
      </header>

      {/* Main Core Area */}
      <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto flex flex-col gap-6 z-20">
        
        {/* Game and Control Center Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Playable Simulator (Canvas + Controls) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#00FF41]" />
                ACTIVE ENGINE STAGE (PLAYABLE PROTOTYPE)
              </h2>
              <div className="text-[10px] text-slate-500">
                Controls: <kbd className="bg-slate-900 border border-[#00FF41]/10 px-1 py-0.5 rounded text-slate-300">W,A,S,D</kbd> or Touch
              </div>
            </div>

            <VectorCanvas
              engineMetrics={engineMetrics}
              setEngineMetrics={setEngineMetrics}
              swarmState={swarmState}
              setSwarmState={setSwarmState}
              willpowerActive={willpowerActive}
              setWillpowerActive={setWillpowerActive}
              onTargetTriggered={(freq) => {
                setActiveRhythmGame({ isActive: true, targetFreq: freq });
                addLog(`WILLPOWER HARMONIC SENSORS LOCKED: Frequency alignment required.`, 'warn');
              }}
            />

            {/* Rhythm Override overlay area */}
            {activeRhythmGame.isActive && (
              <RhythmGame
                targetFrequency={activeRhythmGame.targetFreq}
                isActive={activeRhythmGame.isActive}
                onSuccess={handleRhythmSuccess}
                onFailure={() => {
                  setActiveRhythmGame(prev => ({ ...prev, isActive: false }));
                  setWillpowerActive(false);
                  addLog('SIGNAL MISALIGNMENT: System feedback shock received!', 'warn');
                }}
              />
            )}
          </div>

          {/* Right Column: Engine Controls, Thermal Sliders, Diagnostics */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* 1. Android SoC Thermal Control Slider */}
            <div className="bg-[#030303]/90 border border-[#00FF41]/20 rounded-xl p-4 glow-border-green">
              <h3 className="text-xs font-bold text-slate-200 border-b border-[#00FF41]/15 pb-2 mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                ANDROID THERMAL CONTROLLER
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Simulate physical SoC device heating. Crossing <strong className="text-rose-400">42°C</strong> triggers JNI NDK callbacks to dynamically downscale Bevy ECS bot compute loops and wgpu vertices.
              </p>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Simulated SoC Temp:</span>
                  <span className={engineMetrics.temperature > 42 ? 'text-rose-400 animate-pulse font-bold glow-text-red' : 'text-[#00FF41] font-bold'}>
                    {engineMetrics.temperature.toFixed(1)}°C
                  </span>
                </div>
                <input
                  id="temperature-slider"
                  type="range"
                  min="32"
                  max="49"
                  step="0.5"
                  value={engineMetrics.temperature}
                  onChange={(e) => handleTempChange(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer bg-slate-900 rounded-lg appearance-none h-1.5 border border-rose-500/20"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>32°C (Cold Start)</span>
                  <span className="text-rose-400 font-bold">42°C (Safeguard)</span>
                  <span>49°C (Meltdown)</span>
                </div>
              </div>

              {/* Quality mode indicator badge */}
              <div className="mt-4 p-2.5 rounded-lg bg-black/60 flex items-center justify-between border border-[#00FF41]/10">
                <span className="text-[10px] text-slate-400">MATH DETAIL LEVEL:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  engineMetrics.renderComplexity === 'High' 
                    ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20'
                    : (engineMetrics.renderComplexity === 'Medium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse')
                }`}>
                  {engineMetrics.renderComplexity === 'High' ? 'ULTRA WGPU' : (engineMetrics.renderComplexity === 'Medium' ? 'MEDIUM GLES3' : 'ELITE NES MODE')}
                </span>
              </div>
            </div>

            {/* 2. Bevy ECS Swarm Coordinator Controller */}
            <div className="bg-[#030303]/90 border border-[#00FF41]/20 rounded-xl p-4 glow-border-green">
              <h3 className="text-xs font-bold text-slate-200 border-b border-[#00FF41]/15 pb-2 mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#00FF41]" />
                BEVY ECS SWARM CONTROLLER
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Force global Swarm entity state transitions. In the final game, these mathematical transitions reconfigure the flocking Boids algorithm in real-time.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {Object.values(SwarmState).map(state => (
                  <button
                    key={state}
                    id={`swarm-btn-${state.toLowerCase()}`}
                    onClick={() => {
                      setSwarmState(state);
                      addLog(`BEVY ECS BROADCAST: Faction override forced [${state}]`, 'info');
                      synth.playTick(500 + Math.random() * 500, 0.05, 0.1);
                    }}
                    className={`px-2.5 py-1.5 text-[10px] rounded font-bold border transition-all ${
                      swarmState === state
                        ? 'bg-[#00FF41]/10 border-[#00FF41] text-[#00FF41] shadow-[0_0_8px_rgba(0,255,65,0.15)]'
                        : 'bg-black border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Android Log Cat Diagnostics */}
            <div className="bg-[#030303]/90 border border-[#00FF41]/20 rounded-xl p-4 glow-border-green flex-1 flex flex-col min-h-[180px]">
              <div className="flex justify-between items-center border-b border-[#00FF41]/15 pb-2 mb-3">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" />
                  LOGCAT DIAGNOSTICS
                </h3>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">REAL-TIME</span>
              </div>
              <div className="flex-1 bg-black/80 rounded border border-[#00FF41]/10 p-2.5 overflow-y-auto max-h-[150px] flex flex-col gap-1.5 scrollbar-thin">
                {messageQueue.map(msg => (
                  <div key={msg.id} className="text-[10px] flex gap-1.5 leading-normal">
                    <span className={`font-bold select-none ${
                      msg.type === 'warn' ? 'text-rose-400' : (msg.type === 'success' ? 'text-[#00FF41]' : 'text-slate-500')
                    }`}>
                      {msg.type === 'warn' ? '[ERR_THERMAL]' : (msg.type === 'success' ? '[OK_HARMONIC]' : '[INFO_BEVY]')}
                    </span>
                    <span className="text-slate-300 flex-1">{msg.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Narrative & Specifications Row (Helpful Context) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 bg-black/40 p-5 rounded-xl border border-[#00FF41]/20">
          <div className="flex flex-col gap-1.5 border-r border-[#00FF41]/15 pr-4">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 glow-text-green">
              <ShieldCheck className="w-4 h-4 text-[#00FF41]" />
              COGNITIVE DAMPENING (PHASE 4)
            </h4>
            <p className="leading-relaxed text-[11px]">
              You are a <strong>Null Node</strong>. Swarms detect humans by biological signatures. Stand still or sneak to keep signature low (10dB). Running, jumping, or holding willpower triggers static and spikes signature, making Boids flock aggressively.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 border-r border-[#00FF41]/15 px-4">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 glow-text-green">
              <Zap className="w-4 h-4 text-[#00FF41]" />
              WILLPOWER TUNING (PHASE 4)
            </h4>
            <p className="leading-relaxed text-[11px]">
              Approach the glowing <strong>Terminal Rings</strong> (TERM_A01, etc.) and hold the spacebar. Align your neon green willpower sine wave with the cyan target wave using the tuner to permanently secure the local nanotech node!
            </p>
          </div>
          <div className="flex flex-col gap-1.5 pl-4">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 glow-text-green">
              <Info className="w-4 h-4 text-[#00FF41]" />
              THERMAL PROTECT (PHASE 5)
            </h4>
            <p className="leading-relaxed text-[11px]">
              Mobile devices overheat. Sliding simulated temperatures past 42°C models the real-world JNI safeguards: reducing the boid count from 800 to 200, simplifying mathematical surfaces, and switching graphics to <strong>Elite-NES Mode</strong> line counts.
            </p>
          </div>
        </div>

        {/* SVO Streaming Simulator (Phase 3 Integration) */}
        <div className="mt-2">
          <SvoStreamingSimulator />
        </div>

        {/* Rust & WGSL Blueprints (Phase 1-5 Source code) */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="w-5 h-5 text-[#00FF41]" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              CARGO SOURCE CODE BLUEPRINTS
            </h2>
          </div>
          <CodeViewer />
        </div>

      </main>

      {/* Footer footer */}
      <footer className="border-t border-slate-900 bg-[#030303] py-4 px-8 mt-12 text-center text-[10px] text-slate-600 z-20">
        <div>NULL NODE COGNITIVE SIMULATOR • TARGET OS: ANDROID NDK (RUST + BEVY + WGPU)</div>
        <div className="mt-1 text-slate-700">SPDX-License-Identifier: Apache-2.0 • 2026 Sandbox Environment</div>
      </footer>
    </div>
  );
}
