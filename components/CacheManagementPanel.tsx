/**
 * Cache Management Panel - UI for managing TTS cache
 */

import React, { useState, useEffect } from 'react';
import { ttsIndexedDbCache } from '../services/ttsIndexedDbCache';

interface CacheStats {
  count: number;
  bytes: number;
}

export const CacheManagementPanel: React.FC<{
  onClose: () => void;
  onClear?: () => void;
}> = ({ onClose, onClear }) => {
  const [stats, setStats] = useState<CacheStats>({ count: 0, bytes: 0 });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const cacheStats = await ttsIndexedDbCache.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all cached audio? This cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      await ttsIndexedDbCache.clearAllChunks();
      await ttsIndexedDbCache.clearAllSessions();
      await loadStats();
      if (onClear) onClear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    } finally {
      setClearing(false);
    }
  };

  const handleEvictLRU = async () => {
    const maxMB = prompt('Enter maximum cache size in MB (e.g., 100):', '100');
    if (!maxMB) return;

    const maxBytes = parseFloat(maxMB) * 1024 * 1024;
    if (isNaN(maxBytes) || maxBytes <= 0) {
      alert('Invalid size');
      return;
    }

    setClearing(true);
    try {
      const evicted = await ttsIndexedDbCache.evictLRU({ maxBytes });
      await loadStats();
      alert(`Evicted ${evicted} chunks`);
    } catch (error) {
      console.error('Failed to evict cache:', error);
      alert('Failed to evict cache');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Cache Management</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px',
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div>Loading cache statistics...</div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Total Chunks:</strong> {stats.count}
              </div>
              <div>
                <strong>Total Size:</strong> {formatBytes(stats.bytes)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleEvictLRU}
                disabled={clearing}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Evict Oldest (Set Max Size)
              </button>

              <button
                onClick={handleClearAll}
                disabled={clearing}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {clearing ? 'Clearing...' : 'Clear All Cache'}
              </button>

              <button
                onClick={loadStats}
                disabled={clearing}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Refresh Stats
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

