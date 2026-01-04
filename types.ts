
export interface AudioMetadata {
  path: string;
  deleteAt?: number | null;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChunkContext {
  summary: string;
  sources: GroundingSource[];
}

export type ViewMode = 'reading' | 'companion';
export type AISpeed = number;
export type Theme = 'default' | 'night' | 'cheerful';
export type ReadUnit = '1/2' | '1' | '2' | '3' | '4' | '1p' | '2p' | 'page';

export interface AppState {
  activeSessionId: string;
  activeChunkId: number;
  aiByChunk: { [chunkId: string]: AudioMetadata };
  userByChunk: { [chunkId: string]: AudioMetadata };
  contextByChunk: { [chunkId: string]: ChunkContext };
  viewMode: ViewMode;
  aiSpeed: AISpeed;
  theme: Theme;
  readUnit: ReadUnit;
  pinnedPaths: string[]; // Phase 8: Persistent pinned audio paths
  rawText?: string; // Phase 4: Persistent practice text
  previousSession?: {
    sessionId: string;
    deleteAt: number;
  };
}

export interface Chunk {
  id: number;
  text: string;
}

export type AudioResource = {
  blob: Blob;
  url: string;
};
