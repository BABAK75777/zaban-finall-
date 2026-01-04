/**
 * Reading Screen - Main TTS playback screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MobileAudioPlayer } from '@zaban/tts-mobile';
import { chunkText, generateChunkHash } from '@zaban/tts-core';
import * as Haptics from 'expo-haptics';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export default function ReadingScreen() {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [player] = useState(() => new MobileAudioPlayer());
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      player.cancel();
    };
  }, []);

  const handlePlay = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Create session
      const response = await fetch(`${API_BASE_URL}/tts/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: 'en-US-Standard-C',
          format: 'mp3',
          chunkMaxChars: 1600,
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setTotalChunks(data.totalChunks);
      setCurrentChunk(0);

      // Fetch and play chunks sequentially
      await playChunksSequentially(data.sessionId, data.totalChunks);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to play audio');
      setIsLoading(false);
    }
  };

  const playChunksSequentially = async (sid: string, total: number) => {
    setIsLoading(false);
    setIsPlaying(true);

    for (let i = 0; i < total; i++) {
      try {
        setCurrentChunk(i + 1);

        // Fetch chunk
        const chunkResponse = await fetch(`${API_BASE_URL}/tts/session/${sid}/chunk/${i}?format=json`);
        
        if (!chunkResponse.ok) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          i--; // Retry same chunk
          continue;
        }

        const chunkData = await chunkResponse.json();
        
        // Convert base64 to blob
        const binaryString = atob(chunkData.audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });

        // Play chunk
        const requestId = player.getNextRequestId();
        await player.play(blob, requestId);
      } catch (error) {
        console.error(`Error playing chunk ${i}:`, error);
        // Continue with next chunk
      }
    }

    setIsPlaying(false);
    setCurrentChunk(0);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleStop = () => {
    player.cancel();
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentChunk(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="Enter text to read..."
          value={text}
          onChangeText={setText}
          editable={!isPlaying && !isLoading}
          accessibilityLabel="Text input for text-to-speech"
          accessibilityHint="Enter the text you want to hear read aloud"
        />

        {totalChunks > 0 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Chunk {currentChunk} of {totalChunks}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={handleStop}
          disabled={!isPlaying && !isLoading}
          accessibilityLabel="Stop playback"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.playButton, (isPlaying || isLoading) && styles.buttonDisabled]}
          onPress={handlePlay}
          disabled={isLoading}
          accessibilityLabel={isPlaying ? 'Pause playback' : 'Start playback'}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  textInput: {
    minHeight: 200,
    padding: 16,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressContainer: {
    padding: 16,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  playButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

