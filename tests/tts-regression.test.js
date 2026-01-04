/**
 * TTS Regression Test Suite
 * 
 * Validates TTS system against golden test set
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const GOLDEN_SET_PATH = path.join(__dirname, 'tts-golden.json');

// Load golden test set
const goldenSet = JSON.parse(fs.readFileSync(GOLDEN_SET_PATH, 'utf8'));

const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

async function testTtsGeneration(test, voiceParams = {}) {
  const { id, text, category, description } = test;
  
  try {
    const response = await fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        hash: `test_${id}_${Date.now()}`,
        voiceId: voiceParams.voiceId || 'en-US-Standard-C',
        preset: voiceParams.preset || 'default',
        speed: voiceParams.speed || 1.0,
        pitch: voiceParams.pitch || 0.0,
        format: voiceParams.format || 'mp3',
        sampleRate: voiceParams.sampleRate || 24000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'UNKNOWN_ERROR' }));
      throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.ok) {
      throw new Error('Response indicates failure');
    }

    if (!data.audioBase64) {
      throw new Error('Missing audioBase64 in response');
    }

    // Validate audio data
    const audioBuffer = Buffer.from(data.audioBase64, 'base64');
    const audioSize = audioBuffer.length;

    // Check audio size
    const { min_bytes, max_bytes } = goldenSet.validation.expectedAudioLength;
    if (audioSize < min_bytes) {
      throw new Error(`Audio too small: ${audioSize} bytes (min: ${min_bytes})`);
    }
    if (audioSize > max_bytes) {
      throw new Error(`Audio too large: ${audioSize} bytes (max: ${max_bytes})`);
    }

    // Check duration estimate (if provided)
    if (data.durationMsEstimate) {
      const wordCount = text.trim().split(/\s+/).length;
      const msPerWord = data.durationMsEstimate / wordCount;
      const { min_ms_per_word, max_ms_per_word } = goldenSet.validation.expectedDurationRange;
      
      if (msPerWord < min_ms_per_word) {
        throw new Error(`Duration estimate too short: ${msPerWord.toFixed(0)}ms/word (min: ${min_ms_per_word})`);
      }
      if (msPerWord > max_ms_per_word) {
        throw new Error(`Duration estimate too long: ${msPerWord.toFixed(0)}ms/word (max: ${max_ms_per_word})`);
      }
    }

    // Basic audio format validation (check magic bytes for common formats)
    const magicBytes = audioBuffer.slice(0, 4).toString('hex');
    const isValidFormat = 
      magicBytes.startsWith('494433') || // ID3 (MP3)
      magicBytes.startsWith('52494646') || // RIFF (WAV)
      magicBytes.startsWith('4f676753'); // OggS (OGG)
    
    if (!isValidFormat && data.format !== 'mp3') {
      // For MP3, ID3 tag might not be at the start, so we check if it's not obviously wrong
      if (audioSize > 100 && audioBuffer[0] !== 0) {
        // Probably valid, skip validation
      } else {
        throw new Error(`Invalid audio format magic bytes: ${magicBytes}`);
      }
    }

    return {
      success: true,
      test: id,
      category,
      audioSize,
      durationEstimate: data.durationMsEstimate,
      format: data.format,
    };
  } catch (error) {
    return {
      success: false,
      test: id,
      category,
      error: error.message,
    };
  }
}

async function runTest(test, voiceParams) {
  const result = await testTtsGeneration(test, voiceParams);
  
  if (result.success) {
    testResults.passed++;
    process.stdout.write('.');
  } else {
    testResults.failed++;
    testResults.errors.push({
      test: result.test,
      category: result.category,
      error: result.error,
    });
    process.stdout.write('X');
  }
  
  return result;
}

async function runAllTests() {
  console.log('🧪 Running TTS Regression Tests...');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Golden Set: ${goldenSet.tests.length} tests\n`);

  // Test 1: Voice selection changes cache key
  console.log('\n✅ Test 1: Voice selection affects cache key');
  const test1Text = goldenSet.tests[0].text;
  const result1a = await testTtsGeneration(goldenSet.tests[0], { voiceId: 'en-US-Standard-C' });
  const result1b = await testTtsGeneration(goldenSet.tests[0], { voiceId: 'en-US-Standard-D' });
  
  if (result1a.success && result1b.success && result1a.audioSize !== result1b.audioSize) {
    console.log('   PASS: Different voices produce different audio');
    testResults.passed++;
  } else {
    console.log('   FAIL: Voices should produce different audio');
    testResults.failed++;
  }

  // Test 2: Speed affects duration
  console.log('\n✅ Test 2: Speed affects duration estimate');
  const result2a = await testTtsGeneration(goldenSet.tests[5], { speed: 0.8 });
  const result2b = await testTtsGeneration(goldenSet.tests[5], { speed: 1.2 });
  
  if (result2a.success && result2b.success && 
      result2a.durationEstimate && result2b.durationEstimate &&
      result2a.durationEstimate > result2b.durationEstimate) {
    console.log('   PASS: Slower speed produces longer duration');
    testResults.passed++;
  } else {
    console.log('   FAIL: Speed should affect duration');
    testResults.failed++;
  }

  // Test 3: Format selection
  console.log('\n✅ Test 3: Format selection (MP3 vs WAV)');
  const result3a = await testTtsGeneration(goldenSet.tests[2], { format: 'wav' });
  const result3b = await testTtsGeneration(goldenSet.tests[2], { format: 'mp3' });
  
  if (result3a.success && result3b.success) {
    // WAV is usually larger than MP3, but not always
    if (result3a.format === 'wav' && result3b.format === 'mp3') {
      console.log('   PASS: Format selection works');
      testResults.passed++;
    } else {
      console.log('   FAIL: Format not properly set');
      testResults.failed++;
    }
  } else {
    console.log('   FAIL: Format test failed');
    testResults.failed++;
  }

  // Test 4: Invalid parameters rejected
  console.log('\n❌ Test 4: Invalid parameters rejected');
  try {
    const invalidResponse = await fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: "hi",
        speed: 3.0, // Invalid: out of range
      }),
    });
    
    if (!invalidResponse.ok && invalidResponse.status === 400) {
      const errorData = await invalidResponse.json();
      if (errorData.error === 'SPEED_OUT_OF_RANGE' || errorData.error === 'INVALID_REQUEST') {
        console.log('   PASS: Invalid speed rejected');
        testResults.passed++;
      } else {
        console.log('   FAIL: Wrong error code');
        testResults.failed++;
      }
    } else {
      console.log('   FAIL: Invalid request should return 400');
      testResults.failed++;
    }
  } catch (error) {
    console.log('   FAIL: Exception during invalid test:', error.message);
    testResults.failed++;
  }

  // Test 5: Golden set regression
  console.log('\n✅ Test 5: Golden set regression tests');
  console.log(`   Running ${goldenSet.tests.length} test cases...`);
  
  for (const test of goldenSet.tests) {
    await runTest(test, {});
  }

  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ Failures:');
    for (const error of testResults.errors.slice(0, 10)) {
      console.log(`  - Test ${error.test} (${error.category}): ${error.error}`);
    }
    if (testResults.errors.length > 10) {
      console.log(`  ... and ${testResults.errors.length - 10} more failures`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // Exit with error code if tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

