/**
 * Audio Service - Recording functionality only
 * 
 * NOTE: Playback is now handled by separate players:
 * - userAudioPlayer.ts for user recordings
 * - aiAudioPlayer.ts for AI-generated audio
 */

import { storageService } from './storageService';
import { audioBalancer } from './audioBalancer';

let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let processedStream: MediaStream | null = null; // Stream with gain applied

export const audioService = {
  async startRecording(): Promise<void> {
    try {
      if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
      }
      if (processedStream) {
        processedStream.getTracks().forEach(t => t.stop());
      }
      
      // Get raw microphone stream
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Apply mic gain if available (mobile only)
      // The balancer will process the stream and return a processed version
      const micGain = audioBalancer.getMicGain();
      processedStream = await audioBalancer.setMicGain(micGain, audioStream) || audioStream;
      
      // Record the processed stream (or original if no gain)
      mediaRecorder = new MediaRecorder(processedStream);
      mediaRecorder.start();
    } catch (err: any) {
      throw new Error("Failed to access microphone.");
    }
  },

  async stopRecording(saveToPath?: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error("No recording in progress"));
        return;
      }

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        // Phase 3: Only save if path is provided (user audio should not be saved)
        if (saveToPath) {
          await storageService.saveBlob(saveToPath, blob);
        }
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          audioStream = null;
        }
        if (processedStream) {
          processedStream.getTracks().forEach(track => track.stop());
          processedStream = null;
        }
        mediaRecorder = null;
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  },
  
  /**
   * Get current audio stream (for external processing)
   */
  getAudioStream(): MediaStream | null {
    return audioStream;
  },
};
