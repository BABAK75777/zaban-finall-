/**
 * Manual test script for /tts endpoint
 * 
 * Usage:
 *   1. Start the backend server: npm run dev
 *   2. Run this script: node test-tts.js
 * 
 * This script tests all required scenarios:
 * ✅ Test 1 – happy path
 * ❌ Test 2 – empty text
 * ❌ Test 3 – Gemini failure simulation (requires mocking or invalid API key)
 * ❌ Test 4 – no audio in response (requires mocking)
 */

const BASE_URL = 'http://localhost:3001';

async function testTtsEndpoint(testName, payload, expectedStatus, expectedError = null) {
  console.log(`\n🧪 ${testName}`);
  console.log('   Payload:', JSON.stringify(payload));
  
  try {
    const response = await fetch(`${BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType?.includes('audio')) {
      const blob = await response.blob();
      responseData = {
        ok: true,
        audioSize: blob.size,
        contentType: contentType
      };
    } else {
      const text = await response.text();
      responseData = { raw: text };
    }

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, JSON.stringify(responseData, null, 2));

    if (response.status === expectedStatus) {
      if (expectedError && responseData.error !== expectedError) {
        console.log(`   ❌ FAIL: Expected error "${expectedError}", got "${responseData.error}"`);
        return false;
      }
      console.log(`   ✅ PASS`);
      return true;
    } else {
      console.log(`   ❌ FAIL: Expected status ${expectedStatus}, got ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Request failed:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting TTS Endpoint Tests\n');
  console.log('⚠️  Make sure the backend server is running on', BASE_URL);
  console.log('⚠️  Make sure OPENROUTER_API_KEY is set in backend/.env\n');

  const results = [];

  // ✅ Test 1 – happy path
  results.push(await testTtsEndpoint(
    'Test 1: Happy path',
    { text: 'Hello world', path: 'test_1' },
    200
  ));

  // ❌ Test 2 – empty text
  results.push(await testTtsEndpoint(
    'Test 2: Empty text (whitespace only)',
    { text: '   ', path: 'test_2' },
    400,
    'EMPTY_TEXT'
  ));

  // ❌ Test 2b – missing text
  results.push(await testTtsEndpoint(
    'Test 2b: Missing text field',
    { path: 'test_2b' },
    400,
    'EMPTY_TEXT'
  ));

  // ❌ Test 2c – text too long
  const longText = 'a'.repeat(5001);
  results.push(await testTtsEndpoint(
    'Test 2c: Text too long (>5000 chars)',
    { text: longText, path: 'test_2c' },
    400,
    'TEXT_TOO_LONG'
  ));

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('   ✅ All tests passed!');
  } else {
    console.log('   ❌ Some tests failed');
  }
  console.log('='.repeat(50));

  console.log('\n📝 Note:');
  console.log('   - Test 3 (Gemini failure) requires mocking or invalid API key');
  console.log('   - Test 4 (no audio in response) requires response mocking');
  console.log('   - Check server logs for detailed error information');
}

// Run tests
runTests().catch(console.error);

