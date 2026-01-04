
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, Chunk, Theme, ReadUnit } from '../types';
import { storageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import { userAudioPlayer } from '../services/userAudioPlayer';
import { aiAudioPlayer } from '../services/aiAudioPlayer';
import { ttsOrchestrator, OrchestratorProgress, OrchestratorState } from '../services/ttsOrchestrator';
import { streamingTtsOrchestrator, StreamingProgress } from '../services/streamingTtsOrchestrator';
import { chunkedTtsPlayer } from '../services/chunkedTtsPlayer';
import { cleanupService } from '../services/cleanupService';
import { ocrService, OcrError } from '../services/ocrService';
import { TtsError } from '../services/geminiTtsService';
import { getBaseUrl } from '../services/api';
import { CacheManagementPanel } from './CacheManagementPanel';

const UNIT_STORAGE_KEY = 'readonly_read_unit';
const PINNED_STORAGE_KEY = 'readonly_pinned_paths';

const ReadingScreen: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<OcrError | null>(null);
  const [ttsProgress, setTtsProgress] = useState<OrchestratorProgress | null>(null);
  const [ttsState, setTtsState] = useState<OrchestratorState | null>(null);
  const [streamingProgress, setStreamingProgress] = useState<StreamingProgress | null>(null);
  // Feature flag: use streaming TTS (default false, can be enabled via VITE_USE_STREAMING_TTS=true)
  const [useStreaming] = useState(() => {
    const envValue = (import.meta as any).env?.VITE_USE_STREAMING_TTS;
    // If env var is explicitly set, use it; otherwise default to false
    if (envValue !== undefined) {
      return envValue === 'true' || envValue === '1';
    }
    return false; // Default to non-streaming
  });
  
  const [showHub, setShowHub] = useState(false);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [showCachePanel, setShowCachePanel] = useState(false);
  
  
  const isRecordingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const lastOcrFileRef = useRef<{ base64: string; mimeType: string } | null>(null);
  const hearAiDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHearAiProcessing = useRef(false);
  // Phase 2: Audio buffer - stores audio blob per chunk text
  const audioBufferRef = useRef<Map<string, Blob>>(new Map());

  // Setup orchestrator event handlers
  useEffect(() => {
    ttsOrchestrator.onProgress((progress) => {
      setTtsProgress(progress);
      setIsTtsLoading(progress.stage === 'generating' || progress.stage === 'preparing');
    });

    ttsOrchestrator.onError((error) => {
      console.error('[TTS:Orchestrator] Error:', error);
      setError(`TTS error: ${error.message}`);
      setIsTtsLoading(false);
    });

    ttsOrchestrator.onState((state) => {
      setTtsState(state);
    });

    return () => {
      ttsOrchestrator.cleanup();
    };
  }, []);


  const splitHalfSentence = (sentence: string): string[] => {
    const midPoint = sentence.indexOf(',', Math.floor(sentence.length / 3));
    if (midPoint !== -1 && midPoint < sentence.length * 0.7) {
      return [sentence.slice(0, midPoint + 1).trim(), sentence.slice(midPoint + 1).trim()];
    }
    const words = sentence.split(/\s+/);
    if (words.length <= 1) return [sentence];
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
  };

  const splitIntoSentences = (text: string): string[] => {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  };

  /**
   * Phase 5: Extract the last paragraph from text
   * Returns the last paragraph (separated by double newlines) or empty string
   */
  const getLastParagraph = (text: string): string => {
    if (!text || !text.trim()) return '';
    
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length === 0) return '';
    
    // Return the last paragraph
    return paragraphs[paragraphs.length - 1].trim();
  };

  const createChunks = (text: string, unit: ReadUnit): Chunk[] => {
    if (!text.trim()) return [];
    let result: string[] = [];
    switch (unit) {
      case '1/2':
        splitIntoSentences(text).forEach(s => {
          result.push(...splitHalfSentence(s));
        });
        break;
      case '1':
      case '2':
      case '3':
      case '4': {
        const n = parseInt(unit);
        const sentences = splitIntoSentences(text);
        for (let i = 0; i < sentences.length; i += n) {
          result.push(sentences.slice(i, i + n).join(' '));
        }
        break;
      }
      case '1p':
      case '2p': {
        const pn = unit === '1p' ? 1 : 2;
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        for (let i = 0; i < paragraphs.length; i += pn) {
          result.push(paragraphs.slice(i, i + pn).join('\n\n'));
        }
        break;
      }
      case 'page':
        result = [text];
        break;
      default:
        result = splitIntoSentences(text);
    }
    return result.filter(r => r.trim()).map((t, i) => ({ id: i, text: t.trim() }));
  };

  const isApiKeyMissing = false;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear debounce timer
      if (hearAiDebounceTimer.current) {
        clearTimeout(hearAiDebounceTimer.current);
        hearAiDebounceTimer.current = null;
      }
      
      // Cancel any ongoing TTS playback
      chunkedTtsPlayer.cleanup();
      streamingTtsOrchestrator.cancel();
      ttsOrchestrator.cleanup();
      
      // Cancel user audio if playing
      userAudioPlayer.stop();
      
      const isDev = (import.meta as any)?.env?.DEV;
      if (isDev) {
        console.log('[TTS:UI] 🧹 Component unmounting, cleanup complete');
      }
    };
  }, []);

  useEffect(() => {
    const init = async () => {

      try {
        let loaded = await storageService.loadState();
        const sessionId = Date.now().toString();
        const savedUnit = localStorage.getItem(UNIT_STORAGE_KEY) as ReadUnit;
        const initialUnit = savedUnit || '1';
        const savedPinned = localStorage.getItem(PINNED_STORAGE_KEY);
        const initialPinned = savedPinned ? JSON.parse(savedPinned) : [];
        if (!loaded) {
          const welcome = "Welcome to ReadOnly. Practice reading with calmness and focus.";
          loaded = {
            activeSessionId: sessionId,
            activeChunkId: 0,
            aiByChunk: {},
            userByChunk: {},
            contextByChunk: {},
            viewMode: 'reading',
            aiSpeed: 1.0,
            theme: 'default',
            readUnit: initialUnit,
            pinnedPaths: initialPinned,
            rawText: welcome // Phase 4: Save rawText in state
          };
          setRawText(welcome);
          setChunks(createChunks(welcome, initialUnit));
        } else {
          loaded.activeSessionId = sessionId;
          // Keep saved aiSpeed if it exists, otherwise default to 1.0
          if (loaded.aiSpeed === undefined || loaded.aiSpeed === null) {
            loaded.aiSpeed = 1.0;
          }
          // Phase 4: Preserve saved readUnit or use from localStorage
          loaded.readUnit = loaded.readUnit || initialUnit;
          loaded.pinnedPaths = initialPinned;
          // Phase 4: Load saved rawText or use default
          const savedRawText = loaded.rawText || "The quietest mind learns the most. Silence is a source of great strength.";
          setRawText(savedRawText);
          setChunks(createChunks(savedRawText, loaded.readUnit));
        }
        // Apply saved AI Speed to aiAudioPlayer
        if (loaded.aiSpeed) {
          aiAudioPlayer.setPlaybackRate(loaded.aiSpeed);
        }
        
        // Phase 4: Load audio buffer from localStorage
        if (loaded.rawText) {
          const savedChunks = createChunks(loaded.rawText, loaded.readUnit || initialUnit);
          for (const chunk of savedChunks) {
            const aiPath = storageService.getAiPath(chunk.text);
            const savedBlob = await storageService.getBlob(aiPath);
            if (savedBlob) {
              audioBufferRef.current.set(chunk.text, savedBlob);
              const isDev = (import.meta as any)?.env?.DEV;
              if (isDev) {
                console.log('[TTS:UI] 📦 Loaded audio from storage for:', chunk.text.substring(0, 50) + '...');
              }
            }
          }
        }
        
        const cleaned = await cleanupService.cleanup(loaded);
        setState(cleaned);
      } catch (e) {
        setError("Practice space could not be initialized.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!state || chunks.length === 0) return;
    const cleanupCache = async () => {
      const currentIdx = state.activeChunkId;
      const keepPaths = [...state.pinnedPaths];
      [currentIdx - 1, currentIdx, currentIdx + 1].forEach(idx => {
        if (chunks[idx]) keepPaths.push(storageService.getAiPath(chunks[idx].text));
      });
      await storageService.purgeUnusedAiAudio(keepPaths);
    };
    cleanupCache();
  }, [state?.activeChunkId, chunks, state?.pinnedPaths]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear debounce timer
      if (hearAiDebounceTimer.current) {
        clearTimeout(hearAiDebounceTimer.current);
        hearAiDebounceTimer.current = null;
      }
      
      // Cancel any ongoing TTS playback
      chunkedTtsPlayer.cleanup();
      streamingTtsOrchestrator.cancel();
      ttsOrchestrator.cleanup();
      
      // Cancel user audio if playing
      userAudioPlayer.stop();
      
      const isDev = (import.meta as any)?.env?.DEV;
      if (isDev) {
        console.log('[TTS:UI] 🧹 Component unmounting, cleanup complete');
      }
    };
  }, []);

  const processNewText = (text: string, unit?: ReadUnit) => {
    const currentUnit = unit || (state?.readUnit || '1');
    
    // Phase 5: If there's existing text, keep only the last paragraph and append new text
    let finalText = text;
    if (rawText && rawText.trim()) {
      const lastParagraph = getLastParagraph(rawText);
      if (lastParagraph) {
        // Combine: [last paragraph of previous text] + [new text]
        finalText = lastParagraph + '\n\n' + text;
      }
    }
    
    const newChunks = createChunks(finalText, currentUnit);
    setChunks(newChunks);
    setRawText(finalText);
    
    if (state) {
      // Phase 5: Calculate new activeChunkId
      // Test says "محل خواندن به ابتدای بخش جدید نپرد" - meaning don't jump to start of new section
      // Preserve current position if it's still valid in the new combined text
      let newActiveChunkId = state.activeChunkId;
      
      if (rawText && rawText.trim()) {
        const lastParagraph = getLastParagraph(rawText);
        if (lastParagraph) {
          // Calculate how many chunks the last paragraph takes in the new combined text
          const lastParagraphChunks = createChunks(lastParagraph, currentUnit);
          const lastParagraphChunkCount = lastParagraphChunks.length;
          
          // Preserve current position if it's within the last paragraph
          // If it's beyond, keep it (user was already past the last paragraph)
          // But ensure it doesn't exceed new chunks length
          if (newActiveChunkId >= newChunks.length) {
            // If current position is beyond new chunks, set to start of new section
            newActiveChunkId = lastParagraphChunkCount;
          }
          // Otherwise, keep the current position
        } else {
          // No last paragraph to keep, preserve position if valid
          if (newActiveChunkId >= newChunks.length) {
            newActiveChunkId = 0;
          }
        }
      } else {
        // No previous text, preserve position if valid
        if (newActiveChunkId >= newChunks.length) {
          newActiveChunkId = 0;
        }
      }
      
      // Ensure activeChunkId is within bounds
      if (newActiveChunkId < 0) {
        newActiveChunkId = 0;
      }
      if (newActiveChunkId >= newChunks.length) {
        newActiveChunkId = Math.max(0, newChunks.length - 1);
      }
      
      // Phase 4: Save rawText in state
      const newState = { 
        ...state, 
        activeChunkId: newActiveChunkId, 
        readUnit: currentUnit, 
        rawText: finalText 
      };
      setState(newState);
      storageService.saveState(newState);
    }
  };

  const handleUnitChange = (unit: ReadUnit) => {
    if (!state) return;
    localStorage.setItem(UNIT_STORAGE_KEY, unit);
    const newChunks = createChunks(rawText, unit);
    setChunks(newChunks);
    
    // Preserve current activeChunkId when changing unit (don't reset to 0)
    // If current activeChunkId exceeds new chunks length, set to last chunk
    let preservedChunkId = state.activeChunkId;
    if (preservedChunkId >= newChunks.length) {
      preservedChunkId = Math.max(0, newChunks.length - 1);
    }
    
    // Phase 4: Preserve rawText when changing unit
    const newState = { ...state, readUnit: unit, activeChunkId: preservedChunkId, rawText: rawText };
    setState(newState);
    storageService.saveState(newState);
  };

  const handleAiSpeedChange = async (speed: number) => {
    if (!state) return;
    
    // Update state
    const newState = { ...state, aiSpeed: speed };
    setState(newState);
    await storageService.saveState(newState);
    
    // Update aiAudioPlayer playback rate
    aiAudioPlayer.setPlaybackRate(speed);
    
    // Play test sound using Web Speech API (local, no network)
    if ('speechSynthesis' in window) {
      // Cancel any existing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance('Test speed');
      utterance.rate = speed;
      utterance.volume = 0.8;
      utterance.pitch = 1.0;
      
      // Play test sound (does not enter practice buffer, does not change text, not saved)
      window.speechSynthesis.speak(utterance);
    }
  };

  const togglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!state || chunks.length === 0) return;
    const path = storageService.getAiPath(chunks[state.activeChunkId].text);
    let newPinned = [...state.pinnedPaths];
    if (newPinned.includes(path)) {
      newPinned = newPinned.filter(p => p !== path);
    } else {
      newPinned.push(path);
      if (newPinned.length > 10) newPinned.shift();
    }
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(newPinned));
    const newState = { ...state, pinnedPaths: newPinned };
    setState(newState);
    await storageService.saveState(newState);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isApiKeyMissing) return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Test 2A: Log asset information (for file input, we have file object)
    console.log('[OCR] asset.uri:', file.name); // File name (closest to URI)
    console.log('[OCR] asset.mimeType:', file.type);
    console.log('[OCR] asset.fileName:', file.name);
    
    setIsOcrLoading(true);
    setShowHub(false);
    setError(null);
    setOcrError(null); // Clear previous OCR error
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Phase 4: Pass full data URL to OCR service (it handles base64 extraction)
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          
          // Store file data for retry
          lastOcrFileRef.current = { base64, mimeType: file.type };
          
          const extracted = await ocrService.extractText(base64, file.type);
          
          // If extraction successful, update text area
          if (extracted && extracted.trim().length > 0) {
            processNewText(extracted);
            setOcrError(null); // Clear error on success
          } else {
            setError("No text found in image. Please paste text manually.");
          }
          setIsOcrLoading(false);
        } catch (err: any) {
          // Phase 4: Handle OcrError gracefully
          setIsOcrLoading(false);
          
          // Check if it's an OcrError
          if (err instanceof OcrError) {
            // Store error for UI display
            setOcrError(err);
            
            // Don't clear current text - preserve user's state
            // State remains "ready" - no reset/crash
            
            const isDev = (import.meta as any)?.env?.DEV;
            if (isDev) {
              console.error('[OCR] OcrError:', {
                code: err.code,
                message: err.message,
                debugId: err.debugId,
                details: err.details
              });
            }
          } else {
            // Fallback for non-OcrError exceptions
            const errorMessage = err?.message || 'OCR failed. Please paste text manually.';
            setError(errorMessage);
            
            const isDev = (import.meta as any)?.env?.DEV;
            if (isDev) {
              console.error('[OCR] Unexpected error:', err);
            }
          }
        }
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setIsOcrLoading(false);
        setOcrError(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Text extraction failed.");
      setIsOcrLoading(false);
      setOcrError(null);
    }
  };
  
  /**
   * Retry OCR with the last file (if available)
   */
  const handleOcrRetry = async () => {
    if (!lastOcrFileRef.current) {
      setOcrError(null);
      return;
    }
    
    // Retry with stored file data
    setIsOcrLoading(true);
    setOcrError(null);
    setError(null);
    
    try {
      const { base64, mimeType } = lastOcrFileRef.current;
      const extracted = await ocrService.extractText(base64, mimeType);
      
      if (extracted && extracted.trim().length > 0) {
        processNewText(extracted);
        setOcrError(null);
      } else {
        setError("No text found in image. Please paste text manually.");
      }
      setIsOcrLoading(false);
    } catch (err: any) {
      setIsOcrLoading(false);
      
      if (err instanceof OcrError) {
        setOcrError(err);
      } else {
        const errorMessage = err?.message || 'OCR failed. Please paste text manually.';
        setError(errorMessage);
      }
    }
  };
  
  /**
   * Close OCR error dialog
   */
  const handleOcrErrorClose = () => {
    setOcrError(null);
  };

  const cycleTheme = async () => {
    if (!state) return;
    const themes: Theme[] = ['default', 'night', 'cheerful'];
    const currentIndex = themes.indexOf(state.theme || 'default');
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    const newState = { ...state, theme: nextTheme };
    setState(newState);
    await storageService.saveState(newState);
  };


  const handleNext = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!state || chunks.length === 0) return;
    if (state.activeChunkId === chunks.length - 1) return;
    // Phase 2: Stop AI audio playback immediately when switching chunks
    aiAudioPlayer.stop();
    chunkedTtsPlayer.cancel();
    if (useStreaming) {
      streamingTtsOrchestrator.cancel();
    } else {
      ttsOrchestrator.cancel();
    }
    const nextChunkId = state.activeChunkId + 1;
    const newState: AppState = { ...state, activeChunkId: nextChunkId };
    await storageService.saveState(newState);
    setState(newState);
    setError(null);
    setTtsProgress(null);
    setStreamingProgress(null);
  };

  // Compute currentChunk with useMemo to avoid TDZ issues in handleHearAI
  const currentChunk = useMemo(() => {
    if (!state) return null;
    const currentChunkId = state.activeChunkId;
    return chunks[currentChunkId] || { id: 0, text: "Begin by adding text." };
  }, [state, chunks]);

  /**
   * Handle "Hear AI" button click with debouncing and proper error handling
   * 
   * Features:
   * - 150ms debounce to prevent rapid clicks
   * - Immediate cancellation of previous playback
   * - User-friendly error messages
   * - State management with loading indicators
   * - Supports both streaming and non-streaming modes
   */
  const handleHearAI = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }

    // Clear any existing debounce timer
    if (hearAiDebounceTimer.current) {
      clearTimeout(hearAiDebounceTimer.current);
      hearAiDebounceTimer.current = null;
    }

    // Guard against concurrent calls
    if (isHearAiProcessing.current) {
      console.log('[TTS:UI] ⚠️  handleHearAI called while processing, cancelling previous');
      if (useStreaming) {
        streamingTtsOrchestrator.cancel();
      } else {
        ttsOrchestrator.cancel();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Validation checks
    if (isApiKeyMissing) {
      setError('API key is missing. Please configure your API key.');
      return;
    }

    if (!state || !currentChunk) {
      console.warn('[TTS:UI] Cannot play: missing state or chunk');
      return;
    }

    // Debounce: wait 150ms before processing
    hearAiDebounceTimer.current = setTimeout(async () => {
      hearAiDebounceTimer.current = null;
      
      // Double-check state after debounce
      if (!state || !currentChunk || isHearAiProcessing.current) {
        return;
      }

      isHearAiProcessing.current = true;
      
      // Cancel any existing playback immediately
      if (useStreaming) {
        streamingTtsOrchestrator.cancel();
      } else {
        ttsOrchestrator.cancel();
      }
      
      // Reset UI state
      setIsTtsLoading(true);
      setError(null);
      setTtsProgress(null);
      setTtsState(null);
      setStreamingProgress(null);

      const isDev = (import.meta as any)?.env?.DEV;
      if (isDev) {
        console.log('[TTS:UI] ▶️  Starting playback', {
          textLength: currentChunk.text.length,
          useStreaming,
        });
      }

      console.log('[TTS:UI:DIAG] 🎯 handleHearAI starting:', {
        textLength: currentChunk.text.length,
        useStreaming,
      });

      try {
        // Direct non-streaming path: POST /tts directly
        if (!useStreaming) {
          // Phase 2: Check buffer first - if audio exists, play from buffer
          const chunkText = currentChunk.text;
          let bufferedAudio = audioBufferRef.current.get(chunkText);
          
          // Phase 4: If not in memory buffer, try loading from localStorage
          if (!bufferedAudio) {
            const aiPath = storageService.getAiPath(chunkText);
            const savedBlob = await storageService.getBlob(aiPath);
            if (savedBlob) {
              bufferedAudio = savedBlob;
              audioBufferRef.current.set(chunkText, savedBlob);
              if (isDev) {
                console.log('[TTS:UI] 📦 Loaded audio from localStorage for:', chunkText.substring(0, 50) + '...');
              }
            }
          }
          
          if (bufferedAudio) {
            // Audio exists in buffer - play directly without API request
            if (isDev) {
              console.log('[TTS:UI] 🎯 Playing from buffer (no API request)');
            }
            
            // Apply AI Speed before playing
            if (state.aiSpeed) {
              aiAudioPlayer.setPlaybackRate(state.aiSpeed);
            }
            
            const requestId = aiAudioPlayer.getNextRequestId();
            await aiAudioPlayer.play(bufferedAudio, requestId);
            
            // Success - clear loading state
            setIsTtsLoading(false);
            setError(null);
            
            if (isDev) {
              console.log('[TTS:UI] ✅ Buffer playback completed');
            }
            return; // ⬅⬅⬅ Exit early - no API request needed
          }
          
          // Audio not in buffer - request from AI
          console.log('[TTS:UI] Using NON-STREAMING /tts (not in buffer)');
          
          const apiUrl = getBaseUrl();
          const res = await fetch(`${apiUrl}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: currentChunk.text,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Non-streaming TTS failed: ${errorData.error || res.statusText}`);
          }

          const data = await res.json();

          if (!data?.ok || !data.audioBase64) {
            throw new Error('Non-streaming TTS failed: Invalid response format');
          }

          // Convert base64 to Blob
          const binaryString = atob(data.audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const mimeType = data.mimeType || 'audio/wav';
          const audioBlob = new Blob([bytes], { type: mimeType });
          
          // Phase 2: Store audio in buffer for future use
          audioBufferRef.current.set(chunkText, audioBlob);
          // Phase 4: Also save to localStorage for persistence across page refreshes
          const aiPath = storageService.getAiPath(chunkText);
          await storageService.saveBlob(aiPath, audioBlob);
          if (isDev) {
            console.log('[TTS:UI] 💾 Audio stored in buffer and localStorage for:', chunkText.substring(0, 50) + '...');
          }
          
          // Apply AI Speed before playing
          if (state.aiSpeed) {
            aiAudioPlayer.setPlaybackRate(state.aiSpeed);
          }
          
          const requestId = aiAudioPlayer.getNextRequestId();
          await aiAudioPlayer.play(audioBlob, requestId);
          
          // Success - clear loading state
          setIsTtsLoading(false);
          setError(null);
          
          if (isDev) {
            console.log('[TTS:UI] ✅ Non-streaming playback completed');
          }
          return; // ⬅⬅⬅ خیلی مهم - exit early
        }

        if (useStreaming) {
          // Use streaming orchestrator
          console.log('[TTS:UI:DIAG] 📡 Calling streamingTtsOrchestrator.startSession');
          await streamingTtsOrchestrator.startSession(
            currentChunk.text,
            {
              chunkMaxChars: 1600,
              speed: 1.0,
              sampleRate: 24000,
            },
            (progress) => {
              console.log('[TTS:UI:DIAG] 📊 Progress callback received:', {
                state: progress.state,
                currentChunk: progress.currentChunk,
                totalChunks: progress.totalChunks,
                generatedChunks: progress.generatedChunks,
                bufferedChunks: progress.bufferedChunks,
                isBuffering: progress.isBuffering,
              });
              setStreamingProgress(progress);
              
              // Phase 4: Update loading state based on progress (clear state machine rules)
              // isTtsLoading = true only if connecting, buffering, or playing with buffering
              // isTtsLoading = false if error, idle, completed
              setIsTtsLoading(
                progress.state === 'connecting' ||
                progress.state === 'buffering' ||
                (progress.state === 'playing' && progress.isBuffering)
              );
              
              // Phase 4: Clear error if state is not error, show error if error state
              if (progress.state !== 'error') {
                setError(null);
              } else {
                // Phase 4: Exit buffering on error - get error from orchestrator
                const lastError = streamingTtsOrchestrator.getLastError?.();
                if (lastError) {
                  setError(`Voice synthesis failed: ${lastError.message}`);
                } else {
                  setError('Voice synthesis failed');
                }
                // Phase 4: Ensure UI exits buffering state
                setIsTtsLoading(false);
              }
              
              if (isDev) {
                console.log('[TTS:UI] Streaming progress:', progress);
              }
            }
          );
          console.log('[TTS:UI:DIAG] ✅ streamingTtsOrchestrator.startSession completed');
        } else {
          // Use legacy orchestrator
          if (ttsState?.stage === 'playing') {
            ttsOrchestrator.pause();
            return;
          }
          if (ttsState?.stage === 'paused') {
            ttsOrchestrator.resume();
            return;
          }
          
          await ttsOrchestrator.prepare(currentChunk.text, {
            speed: 1.0,
            sampleRate: 24000,
          });
          
          await ttsOrchestrator.playFrom(0);
        }

        // Success - clear any previous errors
        setError(null);
        
        if (isDev) {
          console.log('[TTS:UI] ✅ Playback started successfully');
        }
      } catch (err: any) {
        // Handle cancellation gracefully (not an error)
        if (
          err instanceof TtsError && err.code === 'TTS_ABORTED' ||
          err.message === 'Cancelled' ||
          err.message === 'Playback cancelled' ||
          err.message?.includes('aborted')
        ) {
          if (isDev) {
            console.log('[TTS:UI] ⏹️  Playback cancelled by user');
          }
          setError(null);
          return;
        }

        // Handle specific TTS errors with user-friendly messages
        let errorMessage = "Voice synthesis unavailable.";
        
        if (err instanceof TtsError) {
          switch (err.code) {
            case 'TTS_EMPTY':
              errorMessage = "Text is empty. Please select text to read.";
              break;
            case 'TTS_BACKEND_ERROR':
              errorMessage = "Voice synthesis service error. Please try again.";
              break;
            case 'TTS_NETWORK_ERROR':
              errorMessage = isOffline 
                ? "Offline: playing cached audio only. Some chunks may be unavailable."
                : "Network error. Please check your connection.";
              break;
            default:
              errorMessage = "Voice synthesis failed. Please try again.";
          }
        } else if (err instanceof Error) {
          // Handle CORS errors specifically
          if (err.message.includes('CORS') || err.message.includes('blocked by CORS policy')) {
            errorMessage = "Connection blocked. Please check that the backend server is running and accessible.";
            if (isDev) {
              console.error('[TTS:UI] CORS error:', err);
            }
          } else if (err.message.includes('Failed to create session') || err.message.includes('Failed to connect')) {
            errorMessage = "Unable to connect to voice synthesis service. Please check your connection and try again.";
          } else if (err.message.includes('No audio returned')) {
            errorMessage = "No audio was returned from the service. Please try again.";
            if (isDev) {
              console.warn('[TTS:UI] No audio in response:', err);
            }
          } else if (err.message.includes('fetch') && err.message.includes('failed')) {
            errorMessage = "Network error. Please check your connection and ensure the backend server is running.";
          } else {
            errorMessage = err.message || "Voice synthesis failed. Please try again.";
          }
        }
        
        // If offline, show helpful message
        if (isOffline && err.message?.includes('not available offline')) {
          errorMessage = "Offline: This chunk is not cached. Please go online to generate it.";
        }

        setError(errorMessage);
        // Reset streaming progress to exit buffering state on error
        setStreamingProgress(null);
        setTtsProgress(null);
      } finally {
        // Always reset loading state
        setIsTtsLoading(false);
        isHearAiProcessing.current = false;
        
        if (isDev) {
          console.log('[TTS:UI] 🏁 handleHearAI finished');
        }
      }
    }, 150); // 150ms debounce
  }, [state, currentChunk, isApiKeyMissing, useStreaming, ttsState]);

  const handleRecordStart = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); 
    if (e.cancelable) e.preventDefault();
    if (isRecording || !state || showHub) return;
    setError(null);
    
    const isDev = (import.meta as any)?.env?.DEV;
    if (isDev) {
      console.log('[SHADOW] Starting recording...');
    }
    
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = 'Microphone API not available. Use http://localhost:3000 or enable HTTPS.';
        console.error('[SHADOW]', errorMsg);
        setError(errorMsg);
        return;
      }
      
      await audioService.startRecording();
      setIsRecording(true);
      isRecordingRef.current = true;
      
      if (isDev) {
        console.log('[SHADOW] ✅ Recording started');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Microphone unavailable.';
      console.error('[SHADOW] ❌ Failed to start recording:', err);
      
      // Provide specific error messages
      if (err?.name === 'NotAllowedError' || err?.message?.includes('permission')) {
        setError('Microphone permission denied. Please allow microphone access and try again.');
      } else if (err?.name === 'NotFoundError' || err?.message?.includes('not found')) {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (err?.name === 'NotReadableError' || err?.message?.includes('not readable')) {
        setError('Microphone is being used by another application. Please close it and try again.');
      } else if (err?.message?.includes('insecure context') || err?.message?.includes('HTTPS')) {
        setError('Microphone requires HTTPS. Use http://localhost:3000 or enable HTTPS tunnel.');
      } else {
        setError(`Microphone unavailable: ${errorMsg}`);
      }
    }
  };

  const handleResumeLastSession = async () => {
    try {
      const result = await ttsOrchestrator.resumeLastSession();
      if (result) {
        setRawText(result.fullText);
        setChunks(result.chunks.map((c, i) => ({ id: i, text: c.text })));
        await ttsOrchestrator.playFrom(result.startIndex);
      } else {
        setError('No previous session found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resume session');
    }
  };

  const handleRecordStop = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation(); 
    if (!isRecordingRef.current || !state) return;
    
    const isDev = (import.meta as any)?.env?.DEV;
    if (isDev) {
      console.log('[SHADOW] Stopping recording...');
    }
    
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsPlayingUser(true);
    setError(null);
    
    try {
      // Phase 3: Do not save user audio - pass no path to stopRecording
      const userBlob = await audioService.stopRecording();
      
      if (isDev) {
        console.log('[SHADOW] Audio recorded:', {
          blobSize: userBlob.size,
          blobType: userBlob.type,
          duration: 'unknown'
        });
      }
      
      // Send audio to backend for analysis/transcription
      try {
        const apiUrl = getBaseUrl();
        if (isDev) {
          console.log('[SHADOW] Sending audio to backend:', {
            apiBase: apiUrl,
            endpoint: '/shadow',
            blobSize: userBlob.size
          });
        }
        
        // Convert blob to base64 for sending
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(userBlob);
        const audioBase64 = await base64Promise;
        
        const response = await fetch(`${apiUrl}/shadow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: audioBase64,
            mimeType: userBlob.type || 'audio/webm',
          }),
        });
        
        if (isDev) {
          console.log('[SHADOW] Backend response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          });
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Backend error: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (isDev) {
          console.log('[SHADOW] Backend response data:', data);
        }
        
        if (!data.ok) {
          throw new Error(data.error || 'Shadow analysis failed');
        }
        
        // Show transcript or score if available
        if (data.transcript) {
          if (isDev) {
            console.log('[SHADOW] Transcript:', data.transcript);
          }
          // Optionally update UI with transcript
          // For now, just log it
        }
        
        if (data.score !== undefined) {
          if (isDev) {
            console.log('[SHADOW] Score:', data.score);
          }
        }
        
      } catch (backendErr: any) {
        console.error('[SHADOW] ❌ Backend request failed:', backendErr);
        // Don't fail completely - still play back the audio
        if (isDev) {
          console.warn('[SHADOW] Continuing with local playback despite backend error');
        }
      }
      
      // Play back the recorded audio
      await userAudioPlayer.play(userBlob);
      
      if (isDev) {
        console.log('[SHADOW] ✅ Playback completed');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Recording or playback failed.';
      console.error('[SHADOW] ❌ Error:', err);
      setError(`Shadow failed: ${errorMsg}`);
    } finally {
      setIsPlayingUser(false);
    }
  };

  if (loading || !state) return null;

  const currentChunkId = state.activeChunkId;
  // currentChunk is already computed with useMemo above
  const isLastChunk = currentChunkId === chunks.length - 1;
  const isPinned = currentChunk && state.pinnedPaths.includes(storageService.getAiPath(currentChunk.text));

  const themeStyles = {
    default: { '--bg': '#FDFDFB', '--surface': '#FFFFFF', '--text-primary': '#1E293B', '--text-secondary': '#94A3B8', '--border': '#F1F5F9', '--accent': '#6366F1', '--btn-bg': '#FFFFFF' },
    night: { '--bg': '#0F172A', '--surface': '#1E293B', '--text-primary': '#E2E8F0', '--text-secondary': '#64748B', '--border': '#334155', '--accent': '#818CF8', '--btn-bg': '#1E293B' },
    cheerful: { '--bg': '#FFFBEC', '--surface': '#FFFFFF', '--text-primary': '#451A03', '--text-secondary': '#D97706', '--border': '#FEF3C7', '--accent': '#F43F5E', '--btn-bg': '#FFFFFF' }
  };
  const vars = themeStyles[state.theme || 'default'] as React.CSSProperties;

  const readUnits: { label: string, short: string, value: ReadUnit }[] = [
    { label: '1/2', short: '½', value: '1/2' },
    { label: '1', short: '1', value: '1' },
    { label: '2', short: '2', value: '2' },
    { label: '3', short: '3', value: '3' },
    { label: '4', short: '4', value: '4' },
    { label: '1p', short: '1¶', value: '1p' },
    { label: '2p', short: '2¶', value: '2p' },
    { label: 'page', short: 'Pg', value: 'page' },
  ];

  return (
    <div className="min-h-screen transition-all duration-1000 select-none flex flex-col items-center px-6 py-12 overflow-x-hidden" style={{ ...vars, backgroundColor: 'var(--bg)' }}>

      {/* Menu Trigger */}
      <button 
        onClick={(e) => { e.stopPropagation(); setShowHub(!showHub); }} 
        disabled={isRecording} 
        className={`fixed top-8 left-8 z-[110] w-12 h-12 flex items-center justify-center rounded-lg border shadow-sm transition-all active:scale-95 ${isRecording ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
        style={{ backgroundColor: 'var(--btn-bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Hub Panel */}
      {showHub && (
        <div className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-300" onClick={() => setShowHub(false)}>
          <div 
            className="absolute top-[4.5rem] left-6 md:left-8 rounded-xl shadow-2xl border flex flex-col animate-in slide-in-from-top-2 duration-300 origin-top-left overflow-y-auto box-border"
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderColor: 'var(--border)',
              width: 'min(360px, calc(100vw - 3rem))',
              maxHeight: 'min(640px, 80vh)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40" style={{ color: 'var(--text-primary)' }}>Hub</h2>
              <button onClick={() => setShowHub(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
                <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-primary)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-2.5">
              <button onClick={() => { setIsTextInputOpen(true); setShowHub(false); }} className="py-3.5 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-black/[0.03] transition-all border group" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                <span className="text-lg">✍️</span><span className="text-[8.5px] font-bold uppercase tracking-[0.2em] opacity-60">Write</span>
              </button>
              <button 
                onClick={() => { if (!isApiKeyMissing) fileInputRef.current?.click(); }} 
                className={`py-3.5 flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all border group ${isApiKeyMissing ? 'opacity-20 cursor-not-allowed' : 'hover:bg-black/[0.03]'}`} 
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              >
                <span className="text-lg">🖼️</span><span className="text-[8.5px] font-bold uppercase tracking-[0.2em] opacity-60">Upload</span>
              </button>
              <button 
                onClick={() => { if (!isApiKeyMissing) cameraInputRef.current?.click(); }} 
                className={`py-3.5 flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all border group ${isApiKeyMissing ? 'opacity-20 cursor-not-allowed' : 'hover:bg-black/[0.03]'}`} 
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              >
                <span className="text-lg">📸</span><span className="text-[8.5px] font-bold uppercase tracking-[0.2em] opacity-60">Scan</span>
              </button>
              <button onClick={cycleTheme} className="py-3.5 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-black/[0.03] transition-all border group" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                <span className="text-lg">🎨</span><span className="text-[8.5px] font-bold uppercase tracking-[0.2em] opacity-60">Theme</span>
              </button>
              <button onClick={() => { setShowCachePanel(true); setShowHub(false); }} className="py-3.5 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-black/[0.03] transition-all border group" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                <span className="text-lg">💾</span><span className="text-[8.5px] font-bold uppercase tracking-[0.2em] opacity-60">Cache</span>
              </button>
            </div>

            <div className="px-6 pb-8 mt-2 flex flex-col gap-6">
              <div className="h-px w-full bg-current opacity-5" />
              
              <div className="flex flex-col gap-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40" style={{ color: 'var(--text-primary)' }}>Read Unit</span>
                <div className="grid grid-cols-4 gap-2">
                  {readUnits.map(unit => (
                    <button 
                      key={unit.value} 
                      onClick={() => handleUnitChange(unit.value)}
                      className={`aspect-square flex items-center justify-center rounded-lg text-[10px] font-bold border transition-all active:scale-90 ${state.readUnit === unit.value ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                      style={{ 
                        backgroundColor: state.readUnit === unit.value ? 'var(--accent)' : 'transparent', 
                        borderColor: state.readUnit === unit.value ? 'var(--accent)' : 'var(--border)',
                        color: state.readUnit === unit.value ? '#FFFFFF' : 'var(--text-primary)'
                      }}
                    >
                      {unit.short}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40" style={{ color: 'var(--text-primary)' }}>AI Speed</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={state.aiSpeed || 1.0}
                    onChange={(e) => handleAiSpeedChange(parseFloat(e.target.value))}
                    className="flex-grow h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((state.aiSpeed || 1.0) - 0.5) / 1.0 * 100}%, var(--border) ${((state.aiSpeed || 1.0) - 0.5) / 1.0 * 100}%, var(--border) 100%)`
                    }}
                  />
                  <span className="text-[10px] font-bold min-w-[3rem] text-right" style={{ color: 'var(--text-primary)' }}>
                    {state.aiSpeed?.toFixed(1) || '1.0'}x
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {isTextInputOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/10 backdrop-blur-sm">
          <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            <h2 className="text-2xl font-light mb-8 font-serif" style={{ color: 'var(--text-primary)' }}>Input practice text</h2>
            <textarea autoFocus className="w-full h-56 p-6 rounded-xl border-none focus:ring-1 resize-none font-serif text-xl leading-relaxed mb-8" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)', caretColor: 'var(--accent)' }} placeholder="Paste content here..." value={rawText} onChange={(e) => setRawText(e.target.value)} />
            <div className="flex gap-4">
              <button onClick={() => setIsTextInputOpen(false)} className="flex-grow py-4 text-sm font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}>Back</button>
              <button onClick={() => { processNewText(rawText); setIsTextInputOpen(false); }} className="flex-grow py-4 rounded-lg text-sm font-bold shadow-lg uppercase tracking-widest text-white transition-transform active:scale-95" style={{ backgroundColor: 'var(--accent)' }}>Commit</button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4: OCR Error Dialog - Graceful error handling */}
      {ocrError && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            <h2 className="text-xl font-light mb-4 font-serif" style={{ color: 'var(--text-primary)' }}>OCR Error</h2>
            
            {/* Error message based on error code */}
            <div className="mb-6">
              {ocrError.code === 'API_KEY_MISSING' ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  OCR is not configured on the server (API key missing).
                </p>
              ) : ocrError.code === 'NETWORK' ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  Cannot connect to OCR service. Please check your connection.
                </p>
              ) : ocrError.code === 'INVALID_IMAGE' ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  Invalid image provided. Please try a different image.
                </p>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {ocrError.details || ocrError.message || 'OCR processing failed.'}
                </p>
              )}
              
              {/* Debug ID for support (dev mode or if available) */}
              {ocrError.debugId && (
                <p className="text-xs mt-2 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                  Debug ID: {ocrError.debugId}
                </p>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              {ocrError.code === 'API_KEY_MISSING' && (
                <button
                  onClick={handleOcrRetry}
                  className="flex-grow py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-widest text-white transition-transform active:scale-95"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Retry
                </button>
              )}
              <button
                onClick={handleOcrErrorClose}
                className={`${ocrError.code === 'API_KEY_MISSING' ? 'flex-grow' : 'w-full'} py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-100`}
                style={{ 
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                  opacity: 0.7
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-3xl relative">
        {isOcrLoading && <div className="absolute flex flex-col items-center gap-6"><div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} /><p className="text-xs font-bold uppercase tracking-[0.4em]">Extracting...</p></div>}
        {isOffline && <div className="absolute top-0 w-full flex justify-center z-[130]"><div className="bg-amber-50 text-amber-700 px-6 py-2 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-sm border border-amber-200 max-w-[90vw] text-center">Offline: Playing cached audio only</div></div>}
        {error && <div className="absolute top-0 w-full animate-bounce flex justify-center z-[130]"><div className="bg-red-50 text-red-600 px-6 py-3 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm border border-red-100 max-w-[90vw] text-center">{error}</div></div>}
        <div className={`transition-all duration-700 w-full text-center ${isOcrLoading ? 'opacity-20 blur-sm' : ''}`}>
           <p className="text-4xl md:text-5xl leading-tight font-serif whitespace-pre-wrap relative inline-block px-4" style={{ color: 'var(--text-primary)' }}>
            {currentChunk?.text ?? "Begin by adding text."}
            <button onClick={togglePin} className={`absolute -top-12 right-0 p-3 transition-all ${isPinned ? 'opacity-100 scale-110' : 'opacity-20 hover:opacity-50 scale-100'}`} style={{ color: isPinned ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <svg className="w-6 h-6" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
            </button>
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center pb-12 gap-6 w-full max-w-sm">
        {/* TTS Progress Indicator */}
        {ttsProgress && ttsProgress.total > 1 && (
          <div className="w-full px-4 py-2 rounded-lg border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: 'var(--text-primary)' }}>
                {ttsProgress.message || `${ttsProgress.stage === 'generating' ? 'Generating' : 'Playing'} chunk ${ttsProgress.chunkIndex} / ${ttsProgress.total}`}
              </span>
              <div className="flex gap-2">
                {ttsState?.stage === 'playing' && (
                  <button
                    onClick={() => ttsOrchestrator.pause()}
                    className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Pause
                  </button>
                )}
                {ttsState?.stage === 'paused' && (
                  <button
                    onClick={() => ttsOrchestrator.resume()}
                    className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Resume
                  </button>
                )}
                <button
                  onClick={() => {
                    ttsOrchestrator.cancel();
                    setTtsProgress(null);
                    setTtsState(null);
                    setIsTtsLoading(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Stop
                </button>
              </div>
            </div>
            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-300" 
                style={{ 
                  width: `${(ttsProgress.chunkIndex / ttsProgress.total) * 100}%`,
                  backgroundColor: 'var(--accent)'
                }}
              />
            </div>
            {/* Skip controls */}
            {ttsState && ttsState.totalChunks > 1 && (
              <div className="flex gap-2 mt-2 justify-center">
                <button
                  onClick={() => ttsOrchestrator.skipPrevious()}
                  disabled={ttsState.currentChunkIndex <= 0}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => ttsOrchestrator.skipNext()}
                  disabled={ttsState.currentChunkIndex >= ttsState.totalChunks - 1}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex w-full gap-4">
          <button 
            onClick={handleHearAI} 
            disabled={isApiKeyMissing || isTtsLoading}
            className={`flex-grow h-20 rounded-xl border font-bold text-xs uppercase tracking-[0.3em] shadow-sm flex items-center justify-center gap-2 transition-all ${isApiKeyMissing ? 'opacity-30 cursor-not-allowed grayscale' : 'active:scale-95'}`} 
            style={{ backgroundColor: 'var(--btn-bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {isTtsLoading 
              ? (useStreaming && streamingProgress
                  ? (streamingProgress.state === 'buffering'
                      ? `Buffering ${streamingProgress.bufferedChunks}/${streamingProgress.totalChunks}`
                      : streamingProgress.state === 'playing'
                        ? `Playing ${streamingProgress.currentChunk + 1}/${streamingProgress.totalChunks}`
                        : streamingProgress.state === 'connecting'
                          ? 'Connecting...'
                          : 'Loading...')
                  : ttsProgress 
                    ? `Chunk ${ttsProgress.chunkIndex}/${ttsProgress.total}` 
                    : 'Loading...')
              : ttsState?.stage === 'paused' 
                ? 'Resume' 
                : streamingProgress?.state === 'paused'
                  ? 'Resume'
                  : streamingProgress?.state === 'playing'
                    ? 'Playing'
                    : 'Hear AI'}
          </button>
          <button 
            onClick={handleNext} 
            disabled={
              isLastChunk || 
              // Phase 4: NEXT enabled when bufferedChunks >= 1 OR state is error/idle/completed
              // NEXT disabled only when buffering AND bufferedChunks < 1
              (useStreaming && streamingProgress && 
               streamingProgress.bufferedChunks < 1 && 
               streamingProgress.state === 'buffering')
            }
            className={`flex-grow h-20 rounded-xl border font-bold text-xs uppercase tracking-[0.3em] shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform ${
              isLastChunk || 
              (useStreaming && streamingProgress && 
               streamingProgress.bufferedChunks < 1 && 
               streamingProgress.state === 'buffering')
                ? 'opacity-20 grayscale' 
                : 'opacity-100'
            }`} 
            style={{ backgroundColor: 'var(--btn-bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Next
          </button>
        </div>
        <button onMouseDown={handleRecordStart} onMouseUp={handleRecordStop} onMouseLeave={handleRecordStop} onTouchStart={handleRecordStart} onTouchEnd={handleRecordStop} className={`w-full h-32 rounded-2xl shadow-sm flex flex-col items-center justify-center border transition-all duration-500 active:scale-95`} style={{ backgroundColor: isRecording ? 'rgba(239,68,68,0.05)' : isPlayingUser ? 'rgba(245,158,11,0.05)' : 'var(--btn-bg)', borderColor: isRecording ? 'rgba(239,68,68,0.2)' : isPlayingUser ? 'rgba(245,158,11,0.2)' : 'var(--border)' }}>
          <span className={`text-sm font-bold tracking-[0.6em] uppercase ${isRecording ? 'text-red-500' : isPlayingUser ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}>{isRecording ? 'Listening' : isPlayingUser ? 'Reviewing' : 'Shadow'}</span>
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />

      {showCachePanel && (
        <CacheManagementPanel
          onClose={() => setShowCachePanel(false)}
          onClear={() => {
            // Clear UI state if needed
          }}
        />
      )}
    </div>
  );
};

export default ReadingScreen;
