export enum SwarmState {
  Dormant = 'DORMANT',
  Aggressive = 'AGGRESSIVE',
  Constructive = 'CONSTRUCTIVE',
  Dissolving = 'DISSOLVING',
}

export interface Nanobot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX?: number;
  targetY?: number;
  noiseOffset: number;
  frequency: number;
  color: string;
}

export enum PlayerState {
  Sneaking = 'SNEAKING',
  Running = 'RUNNING',
  Jumping = 'JUMPING',
  Sliding = 'SLIDING',
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  willpower: number;
  stealthSignature: number; // 0 to 100
  state: PlayerState;
  score: number;
  isAlive: boolean;
}

export interface Threat {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number; // 0 to 1
  speed: number;
  color: string;
  isActive: boolean;
  type: 'laser' | 'bullet' | 'spike';
  width: number;
}

export interface EngineMetrics {
  fps: number;
  temperature: number; // in Celsius (30 to 50)
  activeBots: number;
  cpuLoad: number; // %
  gpuLoad: number; // %
  renderComplexity: 'High' | 'Medium' | 'Low';
  octreeNodes: number;
}

export interface LevelSeed {
  x: number;
  y: number;
  type: 'structure' | 'dunes' | 'corridor' | 'grid';
  height: number;
}
