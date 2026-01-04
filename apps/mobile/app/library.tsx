/**
 * Library Screen - Saved sessions and downloads
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MobileStorageAdapter } from '@zaban/tts-mobile';
import type { SessionMetadata } from '@zaban/tts-core';

export default function LibraryScreen() {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const storage = new MobileStorageAdapter();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      // In a real implementation, you'd list all session files
      // For now, this is a placeholder
      setSessions([]);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSession = ({ item }: { item: SessionMetadata }) => (
    <TouchableOpacity style={styles.sessionItem}>
      <Text style={styles.sessionTitle}>
        {item.title || `Session ${item.sessionKey.substring(0, 8)}`}
      </Text>
      <Text style={styles.sessionMeta}>
        {item.totalChunks} chunks • {item.voiceId || 'Default voice'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sessions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No saved sessions</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.sessionKey}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  sessionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: 14,
    color: '#666',
  },
});

