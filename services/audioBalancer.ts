/**
 * Audio Balancer - Client-side audio balancing controller
 * 
 * Manages relative loudness between user microphone and AI voice.
 * All processing is client-side - no audio data sent to backend.
 * 
 * Rules:
 * - Mic gain ≤ 1.50: AI volume = 100% (1:1 ratio)
 * - Mic gain 1.75: AI volume = 90%
 * - Mic gain 2.0: AI volume = 80%
 * - Mic gain 2.25: AI volume = 70%
 * - Reduction step: 0.10 (10%) per level above 1.50
 */

const isDev = (import.meta as any)?.env?.DEV;

function logDev(...args: unknown[]): void {
  if (isDev) {
    console.log('[AudioBalancer]', ...args);
  }
}

// Available mic gain levels (mobile only)
export const MIC_GAIN_LEVELS = [1.0, 1.50, 1.75, 2.0, 2.25] as const;
export type MicGainLevel = typeof MIC_GAIN_LEVELS[number];

// Web Audio API context and nodes
let audioContext: AudioContext | null = null;
let micGainNode: GainNode | null = null;
let micSourceNode: MediaStreamAudioSourceNode | null = null;
let currentMicGain: MicGainLevel = 1.0;
let currentAiVolume: number = 1.0;

/**
 * Calculate AI volume based on mic gain
 * 
 * Rules:
 * - Mic gain ≤ 1.50: AI volume = 100% (1.0)
 * - Mic gain 1.75: AI volume = 90% (0.9)
 * - Mic gain 2.0: AI volume = 80% (0.8)
 * - Mic gain 2.25: AI volume = 70% (0.7)
 * 
 * Reduction step: 0.10 (10%) per level above 1.50
 */
function calculateAiVolume(micGain: MicGainLevel): number {
  if (micGain <= 1.50) {
    return 1.0; // 100% - no reduction
  }
  
  // Calculate reduction: 0.10 per level above 1.50
  // Levels: 1.0, 1.50, 1.75, 2.0, 2.25
  // Index:  0,   1,    2,    3,   4
  const levelIndex = MIC_GAIN_LEVELS.indexOf(micGain);
  const baseIndex = MIC_GAIN_LEVELS.indexOf(1.50);
  const stepsAboveBase = levelIndex - baseIndex;
  
  // Each step reduces by 0.10 (10%)
  // 1.75 (index 2): 1 step → 90%
  // 2.0 (index 3): 2 steps → 80%
  // 2.25 (index 4): 3 steps → 70%
  const reduction = stepsAboveBase * 0.10;
  const aiVolume = Math.max(0.0, 1.0 - reduction);
  
  logDev(`Mic gain ${micGain} → AI volume ${aiVolume.toFixed(2)} (${(aiVolume * 100).toFixed(0)}%)`);
  return aiVolume;
}

/**
 * Check if device is mobile
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.innerWidth <= 768);
}

/**
 * Initialize Web Audio API context (lazy initialization)
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    logDev('AudioContext initialized');
  }
  return audioContext;
}

/**
 * Apply smooth volume transition to avoid sudden jumps
 */
function smoothVolumeTransition(
  currentVolume: number,
  targetVolume: number,
  durationMs: number = 200
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const startVolume = currentVolume;
    const volumeDiff = targetVolume - startVolume;
    
    const updateVolume = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      
      // Use ease-out curve for smooth transition
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentVol = startVolume + (volumeDiff * easedProgress);
      
      // Update AI volume if audio instance exists
      if (aiAudioInstance) {
        aiAudioInstance.volume = Math.max(0.0, Math.min(1.0, currentVol));
      }
      
      if (progress < 1.0) {
        requestAnimationFrame(updateVolume);
      } else {
        // Ensure final volume is exact
        if (aiAudioInstance) {
          aiAudioInstance.volume = targetVolume;
        }
        resolve();
      }
    };
    
    requestAnimationFrame(updateVolume);
  });
}

// Reference to AI audio instance for volume control
let aiAudioInstance: HTMLAudioElement | null = null;

export const audioBalancer = {
/**
 * Set microphone gain level (mobile only)
 * Applies gain to microphone stream using Web Audio API
 * Returns a processed MediaStream with gain applied
 * 
 * @param gain - Mic gain level (1.0, 1.50, 1.75, 2.0, 2.25)
 * @param audioStream - MediaStream from getUserMedia
 * @returns Processed MediaStream with gain applied (or original if gain = 1.0)
 */
  async setMicGain(gain: MicGainLevel, audioStream: MediaStream | null): Promise<MediaStream | null> {
    // Mic gain is only available on mobile
    if (!isMobile()) {
      logDev('Mic gain is only available on mobile devices');
      return audioStream;
    }
    
    if (!MIC_GAIN_LEVELS.includes(gain)) {
      logDev(`Invalid mic gain level: ${gain}. Using 1.0`);
      gain = 1.0;
    }
    
    currentMicGain = gain;
    logDev(`Setting mic gain to: ${gain}`);
    
    // If no audio stream or gain is 1.0, return original stream
    if (!audioStream || gain === 1.0) {
      logDev('No gain applied (gain = 1.0 or no stream)');
      // Still update AI volume based on gain
      const newAiVolume = calculateAiVolume(gain);
      await this.setAiVolume(newAiVolume);
      return audioStream;
    }
    
    try {
      const ctx = getAudioContext();
      
      // Clean up existing nodes
      if (micSourceNode) {
        micSourceNode.disconnect();
        micSourceNode = null;
      }
      if (micGainNode) {
        micGainNode.disconnect();
        micGainNode = null;
      }
      
      // Create new source and gain nodes
      micSourceNode = ctx.createMediaStreamSource(audioStream);
      micGainNode = ctx.createGain();
      
      // Create destination node to get processed stream
      const destination = ctx.createMediaStreamDestination();
      
      // Set gain value (clamped to prevent excessive clipping)
      const clampedGain = Math.max(0.0, Math.min(2.25, gain));
      micGainNode.gain.value = clampedGain;
      
      // Connect: source -> gain -> destination
      micSourceNode.connect(micGainNode);
      micGainNode.connect(destination);
      
      // Get processed stream
      const processedStream = destination.stream;
      
      logDev(`Mic gain applied: ${clampedGain}, processed stream created`);
      
      // Calculate and apply AI volume reduction
      const newAiVolume = calculateAiVolume(gain);
      await this.setAiVolume(newAiVolume);
      
      return processedStream;
      
    } catch (err) {
      logDev('Error setting mic gain:', err);
      // Fallback to original stream
      const newAiVolume = calculateAiVolume(gain);
      await this.setAiVolume(newAiVolume);
      return audioStream;
    }
  },
  
  /**
   * Get current microphone gain level
   */
  getMicGain(): MicGainLevel {
    return currentMicGain;
  },
  
  /**
   * Get available mic gain levels
   */
  getAvailableGainLevels(): readonly MicGainLevel[] {
    return MIC_GAIN_LEVELS;
  },
  
  /**
   * Set AI voice volume with smooth transition
   * 
   * @param volume - Volume level (0.0 to 1.0)
   */
  async setAiVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0.0, Math.min(1.0, volume));
    const oldVolume = currentAiVolume;
    currentAiVolume = clampedVolume;
    
    logDev(`AI volume: ${(oldVolume * 100).toFixed(0)}% → ${(clampedVolume * 100).toFixed(0)}%`);
    
    // Apply smooth transition if audio is playing
    if (aiAudioInstance && !aiAudioInstance.paused) {
      await smoothVolumeTransition(oldVolume, clampedVolume);
    } else {
      // If not playing, set immediately
      if (aiAudioInstance) {
        aiAudioInstance.volume = clampedVolume;
      }
    }
  },
  
  /**
   * Get current AI volume
   */
  getAiVolume(): number {
    return currentAiVolume;
  },
  
  /**
   * Register AI audio instance for volume control
   * Called by aiAudioPlayer when audio is created
   */
  registerAiAudioInstance(audio: HTMLAudioElement | null): void {
    aiAudioInstance = audio;
    if (audio) {
      // Apply current volume immediately
      audio.volume = currentAiVolume;
      logDev(`AI audio instance registered, volume set to: ${(currentAiVolume * 100).toFixed(0)}%`);
    } else {
      logDev('AI audio instance unregistered');
    }
  },
  
  /**
   * Check if mic gain is available (mobile only)
   */
  isMicGainAvailable(): boolean {
    return isMobile();
  },
  
  /**
   * Reset to default values
   */
  reset(): void {
    currentMicGain = 1.0;
    currentAiVolume = 1.0;
    
    if (micGainNode) {
      micGainNode.gain.value = 1.0;
    }
    
    if (aiAudioInstance) {
      aiAudioInstance.volume = 1.0;
    }
    
    logDev('Audio balancer reset to defaults');
  },
  
  /**
   * Cleanup Web Audio resources
   */
  cleanup(): void {
    if (micSourceNode) {
      micSourceNode.disconnect();
      micSourceNode = null;
    }
    if (micGainNode) {
      micGainNode.disconnect();
      micGainNode = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch((err) => {
        logDev('Error closing AudioContext:', err);
      });
      audioContext = null;
    }
    aiAudioInstance = null;
    logDev('Audio balancer cleaned up');
  },
};

