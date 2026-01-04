/**
 * TTS Benchmark Script
 * 
 * Runs performance and quality benchmarks on the TTS system
 */

import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const BENCHMARK_SAMPLES = {
  short: [
    "Hello, world.",
    "The quick brown fox jumps over the lazy dog.",
    "Testing TTS quality."
  ],
  medium: [
    "The art of reading is not in understanding every word, but in grasping the meaning behind them.",
    "In the quiet moments of reflection, we find the wisdom that guides our decisions.",
    "Technology evolves rapidly, yet human understanding remains constant."
  ],
  long: [
    "The journey of a thousand miles begins with a single step. This ancient wisdom reminds us that every great accomplishment starts with the decision to try. Whether learning a new language, mastering a skill, or building relationships, the first step is always the hardest, but it sets in motion the momentum that carries us forward.",
    "Reading is not just about consuming words; it is about engaging with ideas, questioning assumptions, and expanding our worldview. When we read thoughtfully, we enter into a dialogue with the author, considering their perspective while maintaining our own critical thinking. This active engagement transforms reading from a passive activity into an intellectual adventure."
  ]
};

const TEST_PARAMETERS = [
  { voiceId: 'en-US-Standard-C', preset: 'default', speed: 1.0, pitch: 0.0, format: 'mp3' },
  { voiceId: 'en-US-Standard-D', preset: 'calm', speed: 0.8, pitch: -2.0, format: 'wav' },
  { voiceId: 'en-US-Standard-E', preset: 'energetic', speed: 1.2, pitch: 2.0, format: 'ogg' },
];

const METRICS = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  successes: 0,
  errors: 0,
  totalLatency: 0,
  totalGenerationTime: 0,
  totalAudioSize: 0,
  errorByCode: {},
  latencies: [],
  generationTimes: [],
  audioSizes: [],
};

async function benchmarkTts(text, params, category) {
  const startTime = Date.now();
  const requestStart = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        hash: `bench_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...params
      }),
    });

    const timeToFirstByte = Date.now() - requestStart;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'UNKNOWN_ERROR' }));
      const errorCode = errorData.error || 'UNKNOWN_ERROR';
      METRICS.errors++;
      METRICS.errorByCode[errorCode] = (METRICS.errorByCode[errorCode] || 0) + 1;
      
      return {
        success: false,
        error: errorCode,
        category,
        params,
        textLength: text.length,
      };
    }

    const data = await response.json();
    const totalTime = Date.now() - startTime;
    const audioSize = data.audioBase64 ? Buffer.from(data.audioBase64, 'base64').length : 0;
    const cacheHit = response.headers.get('X-Cache-Hit') === 'true';

    METRICS.totalRequests++;
    METRICS.successes++;
    if (cacheHit) {
      METRICS.cacheHits++;
    } else {
      METRICS.cacheMisses++;
      METRICS.totalGenerationTime += totalTime;
      METRICS.generationTimes.push(totalTime);
    }
    
    METRICS.totalLatency += timeToFirstByte;
    METRICS.latencies.push(timeToFirstByte);
    METRICS.totalAudioSize += audioSize;
    METRICS.audioSizes.push(audioSize);

    return {
      success: true,
      category,
      params,
      textLength: text.length,
      timeToFirstByte,
      totalTime,
      audioSize,
      cacheHit,
      durationEstimate: data.durationMsEstimate,
    };
  } catch (error) {
    METRICS.errors++;
    METRICS.errorByCode['NETWORK_ERROR'] = (METRICS.errorByCode['NETWORK_ERROR'] || 0) + 1;
    
    return {
      success: false,
      error: error.message,
      category,
      params,
      textLength: text.length,
    };
  }
}

function calculateStats(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('TTS BENCHMARK RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n📊 Overall Metrics:');
  console.log(`  Total Requests:     ${METRICS.totalRequests}`);
  console.log(`  Successes:          ${METRICS.successes}`);
  console.log(`  Errors:             ${METRICS.errors}`);
  console.log(`  Cache Hits:         ${METRICS.cacheHits}`);
  console.log(`  Cache Misses:       ${METRICS.cacheMisses}`);
  console.log(`  Cache Hit Rate:     ${METRICS.totalRequests > 0 ? ((METRICS.cacheHits / METRICS.totalRequests) * 100).toFixed(1) : 0}%`);

  if (METRICS.errors > 0) {
    console.log('\n❌ Errors by Code:');
    for (const [code, count] of Object.entries(METRICS.errorByCode)) {
      console.log(`  ${code}: ${count}`);
    }
  }

  if (METRICS.latencies.length > 0) {
    const latencyStats = calculateStats(METRICS.latencies);
    console.log('\n⏱️  Time to First Byte (ms):');
    console.log(`  Min:    ${latencyStats.min.toFixed(2)}`);
    console.log(`  Max:    ${latencyStats.max.toFixed(2)}`);
    console.log(`  Avg:    ${latencyStats.avg.toFixed(2)}`);
    console.log(`  Median: ${latencyStats.median.toFixed(2)}`);
    console.log(`  P95:    ${latencyStats.p95.toFixed(2)}`);
    console.log(`  P99:    ${latencyStats.p99.toFixed(2)}`);
  }

  if (METRICS.generationTimes.length > 0) {
    const genStats = calculateStats(METRICS.generationTimes);
    console.log('\n⏳ Total Generation Time (ms) - Cache Misses Only:');
    console.log(`  Min:    ${genStats.min.toFixed(2)}`);
    console.log(`  Max:    ${genStats.max.toFixed(2)}`);
    console.log(`  Avg:    ${genStats.avg.toFixed(2)}`);
    console.log(`  Median: ${genStats.median.toFixed(2)}`);
    console.log(`  P95:    ${genStats.p95.toFixed(2)}`);
    console.log(`  P99:    ${genStats.p99.toFixed(2)}`);
  }

  if (METRICS.audioSizes.length > 0) {
    const sizeStats = calculateStats(METRICS.audioSizes);
    const avgSizeKB = sizeStats.avg / 1024;
    console.log('\n💾 Audio Size (bytes):');
    console.log(`  Min:    ${sizeStats.min} (${(sizeStats.min / 1024).toFixed(2)} KB)`);
    console.log(`  Max:    ${sizeStats.max} (${(sizeStats.max / 1024).toFixed(2)} KB)`);
    console.log(`  Avg:    ${sizeStats.avg.toFixed(0)} (${avgSizeKB.toFixed(2)} KB)`);
    console.log(`  Median: ${sizeStats.median.toFixed(0)} (${(sizeStats.median / 1024).toFixed(2)} KB)`);
    console.log(`  P95:    ${sizeStats.p95.toFixed(0)} (${(sizeStats.p95 / 1024).toFixed(2)} KB)`);
  }

  console.log('\n' + '='.repeat(80));
}

async function runBenchmark() {
  console.log('🚀 Starting TTS Benchmark...');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Testing ${TEST_PARAMETERS.length} parameter sets\n`);

  const allResults = [];

  for (const params of TEST_PARAMETERS) {
    console.log(`Testing with: ${JSON.stringify(params)}`);
    
    for (const [category, texts] of Object.entries(BENCHMARK_SAMPLES)) {
      for (const text of texts) {
        const result = await benchmarkTts(text, params, category);
        allResults.push(result);
        
        if (result.success) {
          process.stdout.write('.');
        } else {
          process.stdout.write('X');
        }
      }
    }
    
    console.log(''); // New line after each parameter set
  }

  printResults();

  // Export results as JSON
  const jsonResults = {
    timestamp: new Date().toISOString(),
    metrics: METRICS,
    stats: {
      latency: calculateStats(METRICS.latencies),
      generationTime: calculateStats(METRICS.generationTimes),
      audioSize: calculateStats(METRICS.audioSizes),
    },
    results: allResults,
  };

  console.log('\n💾 Saving results to bench-results.json...');
  const fs = await import('fs');
  fs.writeFileSync('bench-results.json', JSON.stringify(jsonResults, null, 2));
  console.log('✅ Benchmark complete!');
}

// Run benchmark
runBenchmark().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});

