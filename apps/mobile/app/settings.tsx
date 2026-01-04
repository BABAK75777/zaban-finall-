/**
 * Settings Screen - App configuration
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        <Text style={styles.settingText}>Cache Size: 0 MB</Text>
        <Text style={styles.settingText}>Max Cache: 500 MB</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio</Text>
        <Text style={styles.settingText}>Format: MP3</Text>
        <Text style={styles.settingText}>Voice: Default</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
});

