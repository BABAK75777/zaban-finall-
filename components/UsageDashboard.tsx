/**
 * Usage Dashboard Component
 * Shows user's quota usage and statistics
 */

import React, { useEffect, useState } from 'react';
import { getDashboard, DashboardResponse } from '../services/api';
import { ApiClientError } from '../services/api';

export const UsageDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboard();
      setData(response);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { usage, sessions, plan, quotaLimits } = data;

  const charsPercent = (usage.charsGenerated / usage.charsLimit) * 100;
  const chunksPercent = (usage.chunksGenerated / usage.chunksLimit) * 100;
  const sessionsPercent = (usage.sessionsToday / usage.sessionsLimit) * 100;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Usage Dashboard</h2>

      {/* Plan Badge */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          plan === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
        </span>
      </div>

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Characters */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Characters</span>
            <span className="text-sm text-gray-600">
              {usage.charsGenerated.toLocaleString()} / {usage.charsLimit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className={`h-2 rounded-full ${
                charsPercent >= 90 ? 'bg-red-500' : charsPercent >= 75 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(charsPercent, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{charsPercent.toFixed(1)}% used</span>
        </div>

        {/* Chunks */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Chunks</span>
            <span className="text-sm text-gray-600">
              {usage.chunksGenerated} / {usage.chunksLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className={`h-2 rounded-full ${
                chunksPercent >= 90 ? 'bg-red-500' : chunksPercent >= 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(chunksPercent, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{chunksPercent.toFixed(1)}% used</span>
        </div>

        {/* Sessions */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Sessions Today</span>
            <span className="text-sm text-gray-600">
              {usage.sessionsToday} / {usage.sessionsLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className={`h-2 rounded-full ${
                sessionsPercent >= 90 ? 'bg-red-500' : sessionsPercent >= 75 ? 'bg-yellow-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(sessionsPercent, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{sessionsPercent.toFixed(1)}% used</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Cache Hit Rate</div>
          <div className="text-lg font-semibold text-gray-900">
            {usage.cacheHitRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Avg Latency</div>
          <div className="text-lg font-semibold text-gray-900">
            {usage.avgLatencyMs}ms
          </div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Total Requests</div>
          <div className="text-lg font-semibold text-gray-900">
            {usage.requests}
          </div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Audio Generated</div>
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(usage.secondsAudioEst / 60)}m
          </div>
        </div>
      </div>

      {/* Session Stats */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Session Statistics (Last 7 Days)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Sessions</div>
            <div className="text-xl font-bold text-gray-900">{sessions.total}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-xl font-bold text-green-600">{sessions.completed}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Errors</div>
            <div className="text-xl font-bold text-red-600">{sessions.errors}</div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA if approaching limits */}
      {(charsPercent >= 75 || chunksPercent >= 75 || sessionsPercent >= 75) && plan === 'free' && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-yellow-900">Approaching your limits</div>
              <div className="text-sm text-yellow-700 mt-1">
                Upgrade to Pro for higher quotas and priority support.
              </div>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium">
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

