/**
 * Final E2E Test Script - Comprehensive Testing Framework
 * 
 * هدف: تست نهایی کامل که اگر پاس شد، دیگر برنگردیم به این بخش
 * 
 * دستورالعمل:
 * 1. Chrome DevTools را باز کن (F12)
 * 2. Console tab را باز کن
 * 3. این اسکریپت را paste کن و Enter بزن
 * 4. دستورات را یکی یکی اجرا کن
 */

(function() {
  console.log('═══════════════════════════════════════');
  console.log('🧪 Final E2E Test Framework');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  let testResults = {
    rapidFire: {
      name: 'Rapid Fire Test',
      status: 'PENDING',
      evidence: [],
      startTime: null,
      endTime: null
    },
    speedTorture: {
      name: 'Speed Torture Test',
      status: 'PENDING',
      evidence: [],
      startTime: null,
      endTime: null
    },
    offline: {
      name: 'Offline/Backend Down Test',
      status: 'PENDING',
      evidence: [],
      startTime: null,
      endTime: null
    },
    longText: {
      name: 'Long Text Test',
      status: 'PENDING',
      evidence: [],
      startTime: null,
      endTime: null
    }
  };
  
  let networkRequests = [];
  let consoleErrors = [];
  let blobUrls = new Set();
  let playbackRateChanges = [];
  let stateTransitions = [];
  
  // Track network requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    if (typeof url === 'string' && url.includes('/tts')) {
      const requestInfo = {
        url,
        method: options.method || 'GET',
        timestamp: Date.now(),
        testPhase: getCurrentTestPhase()
      };
      
      networkRequests.push(requestInfo);
      console.log(`[E2E:Network] ${requestInfo.method} ${url} (${requestInfo.testPhase})`);
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Track console errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorMsg = args.map(a => String(a)).join(' ');
    consoleErrors.push({
      message: errorMsg,
      timestamp: Date.now(),
      testPhase: getCurrentTestPhase()
    });
    originalConsoleError.apply(console, args);
  };
  
  // Track blob URLs (memory leak detection)
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = function(blob) {
    const url = originalCreateObjectURL.call(URL, blob);
    blobUrls.add(url);
    console.log(`[E2E:Memory] Blob URL created: ${url.substring(0, 50)}... (total: ${blobUrls.size})`);
    return url;
  };
  
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.revokeObjectURL = function(url) {
    blobUrls.delete(url);
    originalRevokeObjectURL.call(URL, url);
    console.log(`[E2E:Memory] Blob URL revoked (remaining: ${blobUrls.size})`);
  };
  
  // Track playback rate changes
  if (window.aiAudioPlayer) {
    const originalSetPlaybackRate = window.aiAudioPlayer.setPlaybackRate;
    window.aiAudioPlayer.setPlaybackRate = function(rate) {
      playbackRateChanges.push({
        rate,
        timestamp: Date.now(),
        testPhase: getCurrentTestPhase()
      });
      console.log(`[E2E:PlaybackRate] Changed to: ${rate}`);
      return originalSetPlaybackRate.call(this, rate);
    };
  }
  
  // Track state transitions (if available)
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    const msg = args.map(a => String(a)).join(' ');
    if (msg.includes('[TTS:Streaming:STATE]')) {
      stateTransitions.push({
        transition: msg,
        timestamp: Date.now(),
        testPhase: getCurrentTestPhase()
      });
    }
    originalConsoleLog.apply(console, args);
  };
  
  let currentTestPhase = 'idle';
  
  function getCurrentTestPhase() {
    return currentTestPhase;
  }
  
  // Test 1: Rapid Fire
  window.testRapidFire = async function() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🧪 Test 1: Rapid Fire');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 Instructions:');
    console.log('   1. Click "Hear AI" button 10 times rapidly');
    console.log('   2. Wait 5 seconds after last click');
    console.log('   3. Call: finishRapidFireTest()');
    console.log('');
    
    currentTestPhase = 'rapidFire';
    testResults.rapidFire.startTime = Date.now();
    testResults.rapidFire.status = 'RUNNING';
    
    // Clear previous data
    networkRequests = [];
    consoleErrors = [];
    playbackRateChanges = [];
    stateTransitions = [];
    
    console.log('✅ Monitoring started. Click "Hear AI" 10 times rapidly now!');
  };
  
  window.finishRapidFireTest = function() {
    currentTestPhase = 'idle';
    testResults.rapidFire.endTime = Date.now();
    
    const duration = testResults.rapidFire.endTime - testResults.rapidFire.startTime;
    const ttsRequests = networkRequests.filter(r => r.url.includes('/tts') && r.method === 'POST');
    const errors = consoleErrors.filter(e => e.testPhase === 'rapidFire');
    const finalBlobCount = blobUrls.size;
    
    console.log('');
    console.log('📊 Rapid Fire Test Results:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   POST /tts requests: ${ttsRequests.length}`);
    console.log(`   Console errors: ${errors.length}`);
    console.log(`   Active blob URLs: ${finalBlobCount}`);
    console.log(`   State transitions: ${stateTransitions.length}`);
    
    // Analysis
    let pass = true;
    const evidence = [];
    
    // Check: Each click should stop previous and start new
    if (ttsRequests.length < 10) {
      pass = false;
      evidence.push(`FAIL: Only ${ttsRequests.length} POST /tts requests (expected ~10)`);
    } else {
      evidence.push(`PASS: ${ttsRequests.length} POST /tts requests (expected ~10)`);
    }
    
    // Check: No errors
    if (errors.length > 0) {
      pass = false;
      evidence.push(`FAIL: ${errors.length} console errors found`);
      errors.forEach(e => evidence.push(`  - ${e.message.substring(0, 100)}`));
    } else {
      evidence.push(`PASS: No console errors`);
    }
    
    // Check: Memory leak (blob URLs should be cleaned up)
    if (finalBlobCount > 5) {
      pass = false;
      evidence.push(`FAIL: ${finalBlobCount} active blob URLs (potential memory leak, expected < 5)`);
    } else {
      evidence.push(`PASS: ${finalBlobCount} active blob URLs (no memory leak)`);
    }
    
    testResults.rapidFire.status = pass ? 'PASS' : 'FAIL';
    testResults.rapidFire.evidence = evidence;
    
    console.log('');
    console.log(`Result: ${testResults.rapidFire.status}`);
    evidence.forEach(e => console.log(`  ${e}`));
    
    return testResults.rapidFire;
  };
  
  // Test 2: Speed Torture
  window.testSpeedTorture = async function() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🧪 Test 2: Speed Torture');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 Instructions:');
    console.log('   1. Start audio playback (click "Hear AI")');
    console.log('   2. While audio is playing, change speed slider 20 times (up/down)');
    console.log('   3. Wait for audio to finish');
    console.log('   4. Call: finishSpeedTortureTest()');
    console.log('');
    
    currentTestPhase = 'speedTorture';
    testResults.speedTorture.startTime = Date.now();
    testResults.speedTorture.status = 'RUNNING';
    
    // Clear previous data
    const initialTtsCount = networkRequests.filter(r => r.url.includes('/tts') && r.method === 'POST').length;
    playbackRateChanges = [];
    
    console.log(`✅ Monitoring started. Initial POST /tts count: ${initialTtsCount}`);
    console.log('   Change speed slider 20 times while audio is playing!');
  };
  
  window.finishSpeedTortureTest = function() {
    currentTestPhase = 'idle';
    testResults.speedTorture.endTime = Date.now();
    
    const duration = testResults.speedTorture.endTime - testResults.speedTorture.startTime;
    const initialTtsCount = networkRequests.filter(r => 
      r.url.includes('/tts') && r.method === 'POST' && r.timestamp < testResults.speedTorture.startTime
    ).length;
    const finalTtsCount = networkRequests.filter(r => 
      r.url.includes('/tts') && r.method === 'POST'
    ).length;
    const newTtsRequests = finalTtsCount - initialTtsCount;
    const speedChanges = playbackRateChanges.filter(p => p.testPhase === 'speedTorture');
    
    console.log('');
    console.log('📊 Speed Torture Test Results:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Speed changes: ${speedChanges.length}`);
    console.log(`   New POST /tts requests during speed changes: ${newTtsRequests}`);
    console.log(`   Playback rate values: [${speedChanges.map(p => p.rate).join(', ')}]`);
    
    // Analysis
    let pass = true;
    const evidence = [];
    
    // Check: No extra TTS requests during speed changes
    if (newTtsRequests > 0) {
      pass = false;
      evidence.push(`FAIL: ${newTtsRequests} new POST /tts requests during speed changes (expected 0)`);
    } else {
      evidence.push(`PASS: No new POST /tts requests during speed changes`);
    }
    
    // Check: Playback rate changes recorded
    if (speedChanges.length < 15) {
      pass = false;
      evidence.push(`FAIL: Only ${speedChanges.length} playback rate changes (expected ~20)`);
    } else {
      evidence.push(`PASS: ${speedChanges.length} playback rate changes recorded`);
    }
    
    // Check: Playback rate values are valid
    const invalidRates = speedChanges.filter(p => p.rate < 0.5 || p.rate > 2.0);
    if (invalidRates.length > 0) {
      pass = false;
      evidence.push(`FAIL: ${invalidRates.length} invalid playback rates (should be 0.5-2.0)`);
    } else {
      evidence.push(`PASS: All playback rates valid (0.5-2.0)`);
    }
    
    testResults.speedTorture.status = pass ? 'PASS' : 'FAIL';
    testResults.speedTorture.evidence = evidence;
    
    console.log('');
    console.log(`Result: ${testResults.speedTorture.status}`);
    evidence.forEach(e => console.log(`  ${e}`));
    
    return testResults.speedTorture;
  };
  
  // Test 3: Offline/Backend Down
  window.testOffline = async function() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🧪 Test 3: Offline/Backend Down');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 Instructions:');
    console.log('   1. Stop backend server (Ctrl+C in backend terminal)');
    console.log('   2. Click "Hear AI" button');
    console.log('   3. Wait 10 seconds');
    console.log('   4. Check UI state');
    console.log('   5. Restart backend server');
    console.log('   6. Click "Hear AI" again');
    console.log('   7. Call: finishOfflineTest()');
    console.log('');
    
    currentTestPhase = 'offline';
    testResults.offline.startTime = Date.now();
    testResults.offline.status = 'RUNNING';
    
    // Clear previous data
    consoleErrors = [];
    stateTransitions = [];
    
    console.log('✅ Monitoring started. Stop backend and click "Hear AI"!');
  };
  
  window.finishOfflineTest = function() {
    currentTestPhase = 'idle';
    testResults.offline.endTime = Date.now();
    
    const duration = testResults.offline.endTime - testResults.offline.startTime;
    const errors = consoleErrors.filter(e => e.testPhase === 'offline');
    const errorTransitions = stateTransitions.filter(t => 
      t.transition.includes('error') && t.testPhase === 'offline'
    );
    
    console.log('');
    console.log('📊 Offline Test Results:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Console errors: ${errors.length}`);
    console.log(`   Error state transitions: ${errorTransitions.length}`);
    
    // Analysis
    let pass = true;
    const evidence = [];
    
    // Check: Error message shown
    const errorMessages = errors.map(e => e.message.toLowerCase());
    const hasNetworkError = errorMessages.some(m => 
      m.includes('fetch') || m.includes('network') || m.includes('failed') || m.includes('cors')
    );
    
    if (!hasNetworkError && errors.length === 0) {
      pass = false;
      evidence.push(`FAIL: No error detected (expected network/connection error)`);
    } else {
      evidence.push(`PASS: Error detected (${errors.length} errors)`);
    }
    
    // Check: State transition to error
    if (errorTransitions.length === 0) {
      pass = false;
      evidence.push(`FAIL: No state transition to error (expected buffering → error)`);
    } else {
      evidence.push(`PASS: State transition to error detected`);
    }
    
    // Manual checks (user must verify)
    evidence.push(`MANUAL: Check UI shows error message`);
    evidence.push(`MANUAL: Check UI exited buffering state`);
    evidence.push(`MANUAL: Check UI not frozen (buttons clickable)`);
    evidence.push(`MANUAL: Check playback works after backend restart`);
    
    testResults.offline.status = pass ? 'PASS' : 'FAIL';
    testResults.offline.evidence = evidence;
    
    console.log('');
    console.log(`Result: ${testResults.offline.status}`);
    evidence.forEach(e => console.log(`  ${e}`));
    
    return testResults.offline;
  };
  
  // Test 4: Long Text
  window.testLongText = async function() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🧪 Test 4: Long Text');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 Instructions:');
    console.log('   1. Paste a long text (2000+ characters) into the app');
    console.log('   2. Click "Hear AI" button');
    console.log('   3. Observe chunking and playback');
    console.log('   4. Test NEXT button during playback');
    console.log('   5. Wait for completion');
    console.log('   6. Call: finishLongTextTest()');
    console.log('');
    
    currentTestPhase = 'longText';
    testResults.longText.startTime = Date.now();
    testResults.longText.status = 'RUNNING';
    
    // Clear previous data
    networkRequests = [];
    stateTransitions = [];
    
    console.log('✅ Monitoring started. Paste long text and click "Hear AI"!');
  };
  
  window.finishLongTextTest = function() {
    currentTestPhase = 'idle';
    testResults.longText.endTime = Date.now();
    
    const duration = testResults.longText.endTime - testResults.longText.startTime;
    const ttsRequests = networkRequests.filter(r => 
      r.url.includes('/tts') && r.method === 'POST' && r.testPhase === 'longText'
    );
    const sessionRequests = networkRequests.filter(r => 
      r.url.includes('/tts/session') && r.testPhase === 'longText'
    );
    const transitions = stateTransitions.filter(t => t.testPhase === 'longText');
    
    console.log('');
    console.log('📊 Long Text Test Results:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   POST /tts requests: ${ttsRequests.length}`);
    console.log(`   POST /tts/session requests: ${sessionRequests.length}`);
    console.log(`   State transitions: ${transitions.length}`);
    
    // Analysis
    let pass = true;
    const evidence = [];
    
    // Check: Chunking worked (multiple requests or session)
    if (sessionRequests.length > 0) {
      evidence.push(`PASS: Using streaming session (${sessionRequests.length} session requests)`);
    } else if (ttsRequests.length > 1) {
      evidence.push(`PASS: Text chunked (${ttsRequests.length} POST /tts requests)`);
    } else {
      pass = false;
      evidence.push(`FAIL: No chunking detected (only ${ttsRequests.length} request)`);
    }
    
    // Check: State transitions
    if (transitions.length > 0) {
      evidence.push(`PASS: State transitions detected (${transitions.length})`);
    } else {
      evidence.push(`WARN: No state transitions logged (may be normal if not using streaming)`);
    }
    
    // Manual checks
    evidence.push(`MANUAL: Check UI remained responsive during playback`);
    evidence.push(`MANUAL: Check NEXT button enabled/disabled correctly`);
    evidence.push(`MANUAL: Check all chunks played successfully`);
    
    testResults.longText.status = pass ? 'PASS' : 'FAIL';
    testResults.longText.evidence = evidence;
    
    console.log('');
    console.log(`Result: ${testResults.longText.status}`);
    evidence.forEach(e => console.log(`  ${e}`));
    
    return testResults.longText;
  };
  
  // Generate final report
  window.generateFinalReport = function() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 FINAL E2E TEST REPORT');
    console.log('═══════════════════════════════════════');
    console.log('');
    
    const allPassed = Object.values(testResults).every(r => r.status === 'PASS');
    const knownIssues = [];
    
    // Check for known issues
    if (testResults.rapidFire.status === 'FAIL') {
      knownIssues.push('Rapid Fire: Audio overlap or memory leak');
    }
    if (testResults.speedTorture.status === 'FAIL') {
      knownIssues.push('Speed Torture: Extra TTS requests or playback issues');
    }
    if (testResults.offline.status === 'FAIL') {
      knownIssues.push('Offline: Error handling or UI freezing');
    }
    if (testResults.longText.status === 'FAIL') {
      knownIssues.push('Long Text: Chunking or UI responsiveness');
    }
    
    const report = `FINAL_E2E_RESULT:
- RapidFire: ${testResults.rapidFire.status} + evidence: ${testResults.rapidFire.evidence.join('; ')}
- SpeedTorture: ${testResults.speedTorture.status} + evidence: ${testResults.speedTorture.evidence.join('; ')}
- Offline: ${testResults.offline.status} + evidence: ${testResults.offline.evidence.join('; ')}
- LongText: ${testResults.longText.status} + evidence: ${testResults.longText.evidence.join('; ')}
- KnownRemainingIssues: ${knownIssues.length > 0 ? knownIssues.join('; ') : 'None'}
- Conclusion: ${allPassed ? 'Ready to move on' : 'Not ready - issues remain'}`;
    
    console.log(report);
    console.log('');
    
    // Copy to clipboard
    navigator.clipboard.writeText(report).then(() => {
      console.log('✅ Report copied to clipboard!');
    }).catch(() => {
      console.log('⚠️  Could not copy to clipboard');
    });
    
    return {
      allPassed,
      results: testResults,
      knownIssues
    };
  };
  
  // View all collected data
  window.viewTestData = function() {
    console.log('📊 All Test Data:');
    console.log('Network Requests:', networkRequests);
    console.log('Console Errors:', consoleErrors);
    console.log('Playback Rate Changes:', playbackRateChanges);
    console.log('State Transitions:', stateTransitions);
    console.log('Active Blob URLs:', Array.from(blobUrls));
    console.log('Test Results:', testResults);
  };
  
  // Clear all data
  window.clearTestData = function() {
    networkRequests = [];
    consoleErrors = [];
    playbackRateChanges = [];
    stateTransitions = [];
    blobUrls.clear();
    testResults = {
      rapidFire: { name: 'Rapid Fire Test', status: 'PENDING', evidence: [], startTime: null, endTime: null },
      speedTorture: { name: 'Speed Torture Test', status: 'PENDING', evidence: [], startTime: null, endTime: null },
      offline: { name: 'Offline/Backend Down Test', status: 'PENDING', evidence: [], startTime: null, endTime: null },
      longText: { name: 'Long Text Test', status: 'PENDING', evidence: [], startTime: null, endTime: null }
    };
    console.log('✅ All test data cleared');
  };
  
  console.log('✅ E2E Test Framework loaded!');
  console.log('');
  console.log('📝 Available Commands:');
  console.log('   testRapidFire() - Start rapid fire test');
  console.log('   finishRapidFireTest() - Finish rapid fire test');
  console.log('   testSpeedTorture() - Start speed torture test');
  console.log('   finishSpeedTortureTest() - Finish speed torture test');
  console.log('   testOffline() - Start offline test');
  console.log('   finishOfflineTest() - Finish offline test');
  console.log('   testLongText() - Start long text test');
  console.log('   finishLongTextTest() - Finish long text test');
  console.log('   generateFinalReport() - Generate final report');
  console.log('   viewTestData() - View all collected data');
  console.log('   clearTestData() - Clear all test data');
  console.log('');
  console.log('💡 Run tests in order: RapidFire → SpeedTorture → Offline → LongText');
})();

