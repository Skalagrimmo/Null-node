import React, { useState, useEffect, useRef } from 'react';
import { Network, Database, Layers, Eye, RefreshCw, Cpu, HardDrive, Compass, ChevronRight } from 'lucide-react';
import { synth } from '../lib/synth';

interface SvoNode {
  x: number;
  y: number;
  z: number;
  id: string;
  seed: string; // u64 hash
  status: 'active' | 'cached' | 'inactive';
  verticesCount: number;
  collidersCount: number;
  gpuChunkId: number;
  alpha: number; // For "Fog of Math"
}

export function SvoStreamingSimulator() {
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0, z: 0 });
  const [loadRadius, setLoadRadius] = useState(2);
  const [hysteresisFactor, setHysteresisFactor] = useState(20); // 20%
  const [fogOfMathDistance, setFogOfMathDistance] = useState(3.5); // Grid units
  const [nodes, setNodes] = useState<SvoNode[]>([]);
  const [ringBufferChunks, setRingBufferChunks] = useState<{ id: number; nodeSeed: string; status: 'free' | 'active' | 'dirty' }[]>([]);
  const [activeThreads, setActiveThreads] = useState<{ id: number; task: string; progress: number }[]>([]);
  const [macroCageActive, setMacroCageActive] = useState(true);
  const [microClutterDensity, setMicroClutterDensity] = useState(5); // Average props per cell
  const [simulationLog, setSimulationLog] = useState<{ id: number; message: string; type: 'info' | 'success' | 'warn' }[]>([]);

  // Initialize ring buffer pool on mount
  useEffect(() => {
    const initialChunks = Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      nodeSeed: '0x00000000',
      status: 'free' as const,
    }));
    setRingBufferChunks(initialChunks);
    addLog('Tier C Buffer Recycler: Pre-allocated 16 chunks of 64KB (1MB total virtual VRAM)', 'success');
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setSimulationLog(prev => [
      { id: Date.now() + Math.random(), message, type },
      ...prev.slice(0, 15)
    ]);
  };

  // Hash function simulating standard u64 spatial coordinates hashing
  const getDeterministicSeed = (x: number, y: number, z: number): string => {
    const rawVal = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
    const hash = Math.abs(rawVal).toString(16).toUpperCase().padStart(8, '0');
    return `0x${hash}`;
  };

  // Re-calculate streamed octree blocks when camera position, loadRadius or hysteresis changes
  useEffect(() => {
    const gridRange = 4; // Simulated world coordinate boundaries (-4 to 4)
    const newNodes: SvoNode[] = [];

    // Helper for euclidean distance
    const getDistance = (n1: {x: number, y: number, z: number}, n2: {x: number, y: number, z: number}) => {
      return Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2 + (n1.z - n2.z) ** 2);
    };

    // Buffer Pool indices allocator tracking
    let currentChunkPool = [...ringBufferChunks];
    let chunksUpdated = false;

    // Loop through all spatial grid coordinates in our immediate world hub
    for (let x = -gridRange; x <= gridRange; x++) {
      for (let y = -gridRange; y <= gridRange; y++) {
        const z = 0; // Maintain 2D slice for beautiful UI presentation
        const dist = getDistance({ x, y, z }, cameraPos);
        const seed = getDeterministicSeed(x, y, z);
        
        // Hysteresis calculation:
        // Loading happens if inside loadRadius.
        // Unloading happens ONLY if outside loadRadius * (1 + hysteresisFactor/100).
        const unloadBoundary = loadRadius * (1 + hysteresisFactor / 100);

        let status: 'active' | 'cached' | 'inactive' = 'inactive';
        let alpha = 0;

        if (dist <= loadRadius) {
          status = 'active';
          // Compute dynamic transparency based on "Fog of Math" shader distance dissolve
          alpha = Math.max(0, Math.min(1, 1 - (dist / fogOfMathDistance)));
        } else if (dist <= unloadBoundary) {
          status = 'cached'; // Retained in hysteresis memory buffer to avoid loading stutter
          alpha = 0.3;
        }

        if (status !== 'inactive') {
          // Find out if this node is already bound to a GPU buffer chunk
          let boundChunk = currentChunkPool.find(c => c.nodeSeed === seed);
          
          if (!boundChunk && status === 'active') {
            // Allocate a new GPU chunk from the pool
            const freeChunk = currentChunkPool.find(c => c.status === 'free' || c.status === 'dirty');
            if (freeChunk) {
              freeChunk.status = 'active';
              freeChunk.nodeSeed = seed;
              boundChunk = freeChunk;
              chunksUpdated = true;
              
              // Simulate Tier B genesis worker thread
              simulateThreadSpawn(seed, x, y);
            } else {
              addLog(`VRAM BUFFER CRITICAL: No free GPU Ring Buffer chunks available for node ${seed}!`, 'warn');
            }
          }

          // Generate deterministic mock line segment & physics collider counts
          const prngVal = parseInt(seed.slice(2, 6), 16) || 1234;
          const verticesCount = (prngVal % 120) + 40;
          const collidersCount = (prngVal % 5) + 2;

          newNodes.push({
            x,
            y,
            z,
            id: `${x},${y},${z}`,
            seed,
            status,
            verticesCount,
            collidersCount,
            gpuChunkId: boundChunk ? boundChunk.id : -1,
            alpha,
          });
        }
      }
    }

    // Flag old unused chunks as "dirty" rather than immediately freeing memory (recycler mechanism)
    currentChunkPool.forEach(chunk => {
      if (chunk.status === 'active') {
        const isStillActive = newNodes.some(n => n.seed === chunk.nodeSeed && n.status === 'active');
        if (!isStillActive) {
          chunk.status = 'dirty';
          chunksUpdated = true;
          addLog(`Tier C Buffer Pool: Chunk #${chunk.id} (${chunk.nodeSeed}) flagged [DIRTY] - ready for override`, 'info');
        }
      }
    });

    if (chunksUpdated) {
      setRingBufferChunks(currentChunkPool);
    }
    setNodes(newNodes);
  }, [cameraPos, loadRadius, hysteresisFactor, fogOfMathDistance, microClutterDensity]);

  const simulateThreadSpawn = (seed: string, x: number, y: number) => {
    const threadId = Math.floor(Math.random() * 4) + 1;
    const taskName = `SVO Block (${x}, ${y}) - fBm Deformation`;
    
    // Add active thread
    setActiveThreads(prev => [...prev, { id: Date.now() + Math.random(), task: taskName, progress: 0 }]);
    addLog(`Tier B Genesis: Dispatched thread worker for coordinate [${x}, ${y}]`, 'info');

    // Play visual feedback sound
    synth.playTick(400 + Math.random() * 200, 0.02, 0.05);
  };

  // Simulate thread work advancement
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveThreads(prev => {
        const updated = prev.map(t => {
          if (t.progress >= 100) return null;
          return { ...t, progress: t.progress + 25 };
        }).filter(Boolean) as { id: number; task: string; progress: number }[];
        
        if (prev.length > updated.length) {
          // A thread completed its math generation
          const completedCount = prev.length - updated.length;
          for (let i = 0; i < completedCount; i++) {
            addLog(`Tier B Async: Math generation completed. Raw Vec<LineVertex> pushed to wgpu Queue.`, 'success');
          }
        }
        return updated;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const moveCamera = (dx: number, dy: number) => {
    setCameraPos(prev => {
      const nextX = Math.max(-4, Math.min(4, prev.x + dx));
      const nextY = Math.max(-4, Math.min(4, prev.y + dy));
      addLog(`Tier A Marcher: Camera translated to coordinates [${nextX}, ${nextY}]`, 'info');
      synth.playMove();
      return { ...prev, x: nextX, y: nextY };
    });
  };

  return (
    <div className="bg-[#030303]/90 border border-[#00FF41]/20 rounded-xl p-5 glow-border-green flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#00FF41]/15 pb-3 gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#00FF41]" />
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider glow-text-green">
              DETERMINISTIC SPATIAL STREAMING SIMULATOR
            </h3>
            <p className="text-[10px] text-slate-500">Interactive live diagnostics of the 3D Bevy & wgpu procedural generation pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-black border border-[#00FF41]/20 p-2 rounded">
          <Compass className="w-3.5 h-3.5 text-[#00FF41] animate-pulse" />
          <span>VIRTUAL CAMERA: [{cameraPos.x}, {cameraPos.y}, {cameraPos.z}]</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visual SVO Node Grid Slice */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#00FF41]" />
              Sparse Octree 2D View slice (9x9 grid)
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => moveCamera(0, 1)}
                className="px-2 py-0.5 text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-slate-300"
              >
                ▲ UP
              </button>
              <button
                onClick={() => moveCamera(0, -1)}
                className="px-2 py-0.5 text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-slate-300"
              >
                ▼ DOWN
              </button>
              <button
                onClick={() => moveCamera(-1, 0)}
                className="px-2 py-0.5 text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-slate-300"
              >
                ◀ LEFT
              </button>
              <button
                onClick={() => moveCamera(1, 0)}
                className="px-2 py-0.5 text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-slate-300"
              >
                RIGHT ▶
              </button>
            </div>
          </div>

          <div className="relative bg-black/60 border border-[#00FF41]/10 rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px]">
            {/* Visual grid representing spatial coordinate nodes */}
            <div className="grid grid-cols-9 gap-1 max-w-[280px] w-full">
              {Array.from({ length: 9 }).map((_, gy) => {
                const y = 4 - gy; // invert coordinate y
                return Array.from({ length: 9 }).map((_, gx) => {
                  const x = gx - 4;
                  const seed = getDeterministicSeed(x, y, 0);
                  const activeNode = nodes.find(n => n.x === x && n.y === y);
                  const isCamera = cameraPos.x === x && cameraPos.y === y;

                  let cellColor = 'bg-black border-slate-900';
                  let borderGlow = 'border';
                  if (isCamera) {
                    cellColor = 'bg-[#00FF41]/20 border-[#00FF41] animate-pulse';
                    borderGlow = 'border-2';
                  } else if (activeNode) {
                    if (activeNode.status === 'active') {
                      cellColor = 'bg-[#00FF41]/10 border-[#00FF41]/40';
                    } else if (activeNode.status === 'cached') {
                      cellColor = 'bg-amber-500/5 border-amber-500/20';
                    }
                  }

                  return (
                    <div
                      key={`${x},${y}`}
                      className={`aspect-square rounded flex flex-col items-center justify-center relative transition-all duration-300 text-[8px] font-mono group cursor-crosshair ${cellColor} ${borderGlow}`}
                      title={`Coord: [${x}, ${y}]\nHashed u64 Seed: ${seed}\nStatus: ${activeNode ? activeNode.status : 'uninstantiated'}`}
                      onClick={() => {
                        setCameraPos({ x, y, z: 0 });
                        addLog(`Tier A Marcher: Force-moved camera to [${x}, ${y}]`, 'info');
                        synth.playMove();
                      }}
                    >
                      {isCamera ? (
                        <span className="text-[#00FF41] font-bold">CAM</span>
                      ) : activeNode ? (
                        <span className={activeNode.status === 'active' ? 'text-[#00FF41]/70' : 'text-amber-500/50'}>
                          {activeNode.gpuChunkId !== -1 ? `#${activeNode.gpuChunkId}` : '...'}
                        </span>
                      ) : (
                        <span className="text-slate-800">.</span>
                      )}

                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:flex flex-col bg-slate-950 border border-[#00FF41]/30 p-2 rounded text-[9px] w-36 text-slate-300 z-50 shadow-xl pointer-events-none">
                        <div className="font-bold border-b border-[#00FF41]/10 pb-0.5 mb-1 text-white">GRID CELL [${x}, ${y}]</div>
                        <div>Hashed Seed: <span className="font-mono text-[#00FF41]">{seed}</span></div>
                        <div>Status: <span className="uppercase text-amber-400">{activeNode ? activeNode.status : 'Inactive (Sparsity)'}</span></div>
                        {activeNode && (
                          <>
                            <div>GPU Chunk: <span className="text-white">#{activeNode.gpuChunkId}</span></div>
                            <div>Lines: <span className="text-white">{activeNode.verticesCount} segments</span></div>
                            <div>Colliders: <span className="text-white">{activeNode.collidersCount} hulls</span></div>
                            <div>Alpha Fade: <span className="text-white">{activeNode.alpha.toFixed(2)}</span></div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>

            {/* Grid Map Legend */}
            <div className="flex gap-4 mt-4 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-[#00FF41]/20 border border-[#00FF41]/50 rounded" />
                <span>Tier A Active ({nodes.filter(n => n.status === 'active').length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-500/5 border border-amber-500/20 rounded" />
                <span>Hysteresis Cached ({nodes.filter(n => n.status === 'cached').length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-black border border-slate-900 rounded" />
                <span>Empty (No Mem Allocated)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Three-Tier Control and Diagnostics Metrics */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[#00FF41]" />
            Pipeline Controllers & Memory Buffers
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Configuration Sliders */}
            <div className="bg-black/40 border border-[#00FF41]/10 p-3.5 rounded-lg flex flex-col gap-3.5 text-xs">
              <div className="font-bold text-slate-200 border-b border-[#00FF41]/10 pb-1 flex items-center justify-between">
                <span>PIPELINE PARAMS</span>
                <Compass className="w-3.5 h-3.5 text-slate-500" />
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Tier A Load Radius:</span>
                  <span className="text-[#00FF41] font-bold">{loadRadius} cells ({loadRadius * 30}m)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="1"
                  value={loadRadius}
                  onChange={(e) => setLoadRadius(parseInt(e.target.value))}
                  className="w-full accent-[#00FF41] cursor-pointer bg-slate-900 rounded h-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Unload Hysteresis Buffer:</span>
                  <span className="text-amber-400 font-bold">+{hysteresisFactor}% (+{(loadRadius * 30 * (hysteresisFactor / 100)).toFixed(0)}m)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="5"
                  value={hysteresisFactor}
                  onChange={(e) => setHysteresisFactor(parseInt(e.target.value))}
                  className="w-full accent-[#00FF41] cursor-pointer bg-slate-900 rounded h-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">"Fog of Math" Dissolve:</span>
                  <span className="text-indigo-400 font-bold">{fogOfMathDistance.toFixed(1)} units</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="4.5"
                  step="0.1"
                  value={fogOfMathDistance}
                  onChange={(e) => setFogOfMathDistance(parseFloat(e.target.value))}
                  className="w-full accent-[#00FF41] cursor-pointer bg-slate-900 rounded h-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Procedural Detail Density:</span>
                  <span className="text-[#00FF41] font-bold">{microClutterDensity} elements/cell</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={microClutterDensity}
                  onChange={(e) => setMicroClutterDensity(parseInt(e.target.value))}
                  className="w-full accent-[#00FF41] cursor-pointer bg-slate-900 rounded h-1"
                />
              </div>
            </div>

            {/* Tier C Ring Buffer Allocation Map */}
            <div className="bg-black/40 border border-[#00FF41]/10 p-3.5 rounded-lg flex flex-col gap-3 text-xs">
              <div className="font-bold text-slate-200 border-b border-[#00FF41]/10 pb-1 flex items-center justify-between">
                <span>TIER C RING BUFFER VRAM MAP</span>
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              </div>
              
              <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                {ringBufferChunks.map(chunk => (
                  <div
                    key={chunk.id}
                    className={`p-1.5 rounded border text-center font-mono text-[9px] flex flex-col gap-0.5 leading-none transition-all duration-300 ${
                      chunk.status === 'active'
                        ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-[#00FF41]'
                        : chunk.status === 'dirty'
                        ? 'border-amber-500/40 bg-amber-500/5 text-amber-500'
                        : 'border-slate-800 bg-slate-950 text-slate-600'
                    }`}
                    title={`GPU CHUNK #${chunk.id}\nNode: ${chunk.nodeSeed}\nStatus: ${chunk.status.toUpperCase()}`}
                  >
                    <span className="font-bold">C-{chunk.id}</span>
                    <span className="text-[7px] truncate opacity-80">
                      {chunk.status === 'free' ? 'FREE' : chunk.nodeSeed.slice(2, 6)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-slate-500 leading-relaxed border-t border-[#00FF41]/5 pt-2 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Active GPU Chunks:</span>
                  <span className="text-white font-bold">{ringBufferChunks.filter(c => c.status === 'active').length} / 16</span>
                </div>
                <div className="flex justify-between">
                  <span>Dirty (Recyclable):</span>
                  <span className="text-amber-500 font-bold">{ringBufferChunks.filter(c => c.status === 'dirty').length} chunks</span>
                </div>
              </div>
            </div>

          </div>

          {/* Active Async Thread Workers Monitor */}
          <div className="bg-black/40 border border-[#00FF41]/10 p-3.5 rounded-lg flex flex-col gap-3 text-xs">
            <div className="font-bold text-slate-200 border-b border-[#00FF41]/10 pb-1 flex items-center justify-between">
              <span>TIER B GENESIS WORKER THREAD POOL</span>
              <RefreshCw className="w-3.5 h-3.5 text-[#00FF41] animate-spin-slow" />
            </div>

            <div className="flex flex-col gap-2 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin">
              {activeThreads.length === 0 ? (
                <div className="text-[10px] text-slate-600 italic py-2 text-center font-mono">
                  All Genesis thread jobs idle. Awaiting camera translation...
                </div>
              ) : (
                activeThreads.map(t => (
                  <div key={t.id} className="flex flex-col gap-1 bg-black p-2 rounded border border-slate-900">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 font-mono truncate">{t.task}</span>
                      <span className="text-[#00FF41] font-bold">{t.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#00FF41] transition-all duration-150"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Simulator Real-Time Output Logs */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          SIMULATOR LIVE OUTPUT PIPELINE EVENTS
        </div>
        <div className="bg-black border border-[#00FF41]/10 rounded-lg p-3 max-h-[130px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
          {simulationLog.map(log => (
            <div key={log.id} className="text-[10px] font-mono flex gap-2 leading-relaxed">
              <span className={`font-bold select-none ${
                log.type === 'warn' ? 'text-rose-500' : log.type === 'success' ? 'text-[#00FF41]' : 'text-slate-500'
              }`}>
                {log.type === 'warn' ? '[PIPELINE_ERROR]' : log.type === 'success' ? '[PIPELINE_RESOLVED]' : '[PIPELINE_EVENT]'}
              </span>
              <span className="text-slate-300 flex-1">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
