/**
 * Phase 3 Diagnostic Script - Normal vs Speed-Change Playback Comparison
 * 
 * Instructions:
 * 1. Open Chrome DevTools (F12) → Console tab
 * 2. Paste this entire script and press Enter
 * 3. Follow the prompts to capture both scenarios
 * 4. Call compareScenarios() to see the differences
 * 
 * Usage:
 * - startNormalCapture() - Start capturing normal playback
 * - startSpeedChangeCapture() - Start capturing speed change playback
 * - compareScenarios() - Compare the two captured scenarios
 */

(function() {
  console.log('🔍 Phase 3 Diagnostic Script Loaded');
  console.log('📋 This script will help compare normal vs speed-change playback');
  console.log('');
  
  let normalCapture = {
    name: 'Normal',
    requests: [],
    startTime: null,
    endTime: null
  };
  
  let speedChangeCapture = {
    name: 'SpeedChanged',
    requests: [],
    startTime: null,
    endTime: null
  };
  
  let currentCapture = null;
  let captureTimeout = null;
  
  // Intercept fetch to capture TTS requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    if (typeof url === 'string' && url.includes('/tts') && currentCapture) {
      const requestInfo = {
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        timestamp: new Date().toISOString(),
        captureType: currentCapture.name
      };
      
      console.log(`🔍 [${currentCapture.name}] TTS Request Detected:`, url);
      
      // Make the actual request and capture response
      const fetchPromise = originalFetch.apply(this, args);
      
      fetchPromise.then(async (response) => {
        const responseInfo = {
          ...requestInfo,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          ok: response.ok,
          // CORS headers
          allowOrigin: response.headers.get('access-control-allow-origin'),
          allowMethods: response.headers.get('access-control-allow-methods'),
          allowHeaders: response.headers.get('access-control-allow-headers'),
        };
        
        // Parse request headers
        if (options.headers) {
          if (options.headers instanceof Headers) {
            responseInfo.requestContentType = options.headers.get('content-type');
            responseInfo.requestId = options.headers.get('x-request-id');
          } else if (typeof options.headers === 'object') {
            responseInfo.requestContentType = options.headers['Content-Type'] || options.headers['content-type'];
            responseInfo.requestId = options.headers['X-Request-Id'] || options.headers['x-request-id'];
          }
        }
        
        // Parse request body if JSON
        if (options.body && typeof options.body === 'string') {
          try {
            const bodyData = JSON.parse(options.body);
            responseInfo.requestBody = {
              text: bodyData.text ? bodyData.text.substring(0, 50) + (bodyData.text.length > 50 ? '...' : '') : 'N/A',
              hash: bodyData.hash ? bodyData.hash.substring(0, 16) + '...' : 'N/A',
              voiceId: bodyData.voiceId || 'N/A',
              preset: bodyData.preset || 'N/A',
              speed: bodyData.speed || 'N/A',
            };
          } catch (e) {
            responseInfo.requestBody = { raw: options.body.substring(0, 100) };
          }
        }
        
        // Check for errors
        if (!response.ok) {
          try {
            const clone = response.clone();
            const errorData = await clone.json();
            responseInfo.error = {
              ok: errorData.ok,
              error: errorData.error,
              details: errorData.details
            };
          } catch (e) {
            responseInfo.error = { message: response.statusText };
          }
        }
        
        currentCapture.requests.push(responseInfo);
        console.log(`📥 [${currentCapture.name}] Response Captured:`, {
          method: responseInfo.method,
          status: responseInfo.status,
          url: responseInfo.url
        });
      }).catch((error) => {
        const errorInfo = {
          ...requestInfo,
          error: { message: error.message, name: error.name },
          status: 'failed'
        };
        currentCapture.requests.push(errorInfo);
        console.error(`❌ [${currentCapture.name}] Request Failed:`, errorInfo);
      });
      
      return fetchPromise;
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Start capturing normal playback
  window.startNormalCapture = function() {
    console.log('🎬 Starting Normal Playback Capture...');
    console.log('   → Now trigger normal playback (click "Hear AI" button)');
    console.log('   → DO NOT touch the speed slider');
    console.log('');
    
    normalCapture.requests = [];
    normalCapture.startTime = Date.now();
    currentCapture = normalCapture;
    
    // Auto-stop after 10 seconds
    if (captureTimeout) clearTimeout(captureTimeout);
    captureTimeout = setTimeout(() => {
      if (currentCapture === normalCapture) {
        normalCapture.endTime = Date.now();
        currentCapture = null;
        console.log('⏹️  Normal capture stopped (timeout)');
        console.log(`   Captured ${normalCapture.requests.length} requests`);
      }
    }, 10000);
  };
  
  // Start capturing speed change playback
  window.startSpeedChangeCapture = function() {
    console.log('🎬 Starting Speed Change Playback Capture...');
    console.log('   → Now change the speed slider and release it');
    console.log('   → This will trigger test playback');
    console.log('');
    
    speedChangeCapture.requests = [];
    speedChangeCapture.startTime = Date.now();
    currentCapture = speedChangeCapture;
    
    // Auto-stop after 10 seconds
    if (captureTimeout) clearTimeout(captureTimeout);
    captureTimeout = setTimeout(() => {
      if (currentCapture === speedChangeCapture) {
        speedChangeCapture.endTime = Date.now();
        currentCapture = null;
        console.log('⏹️  Speed change capture stopped (timeout)');
        console.log(`   Captured ${speedChangeCapture.requests.length} requests`);
      }
    }, 10000);
  };
  
  // Stop current capture
  window.stopCapture = function() {
    if (currentCapture) {
      currentCapture.endTime = Date.now();
      console.log(`⏹️  ${currentCapture.name} capture stopped`);
      console.log(`   Captured ${currentCapture.requests.length} requests`);
      currentCapture = null;
      if (captureTimeout) {
        clearTimeout(captureTimeout);
        captureTimeout = null;
      }
    } else {
      console.log('⚠️  No active capture');
    }
  };
  
  // Compare the two scenarios
  window.compareScenarios = function() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 COMPARISON ANALYSIS');
    console.log('═══════════════════════════════════════');
    console.log('');
    
    // Find OPTIONS and POST requests for each scenario
    const normalOptions = normalCapture.requests.find(r => r.method === 'OPTIONS');
    const normalPost = normalCapture.requests.find(r => r.method === 'POST');
    const speedOptions = speedChangeCapture.requests.find(r => r.method === 'OPTIONS');
    const speedPost = speedChangeCapture.requests.find(r => r.method === 'POST');
    
    // Build result
    const normalResult = {
      OPTIONS_status: normalOptions ? normalOptions.status : 'none',
      POST_status: normalPost ? normalPost.status : 'none',
      Access_Control_Request_Headers: normalOptions?.headers?.['Access-Control-Request-Headers'] || 
                                      (normalOptions?.headers instanceof Headers ? normalOptions.headers.get('access-control-request-headers') : 'N/A'),
      any_errors: normalPost?.error ? JSON.stringify(normalPost.error) : 'none'
    };
    
    const speedResult = {
      OPTIONS_status: speedOptions ? speedOptions.status : 'none',
      POST_status: speedPost ? speedPost.status : 'none',
      Access_Control_Request_Headers: speedOptions?.headers?.['Access-Control-Request-Headers'] || 
                                      (speedOptions?.headers instanceof Headers ? speedOptions.headers.get('access-control-request-headers') : 'N/A'),
      any_errors: speedPost?.error ? JSON.stringify(speedPost.error) : 'none'
    };
    
    // Find differences
    const differences = [];
    
    // Compare OPTIONS status
    if (normalResult.OPTIONS_status !== speedResult.OPTIONS_status) {
      differences.push(`OPTIONS status differs: Normal=${normalResult.OPTIONS_status}, Speed=${speedResult.OPTIONS_status}`);
    }
    
    // Compare POST status
    if (normalResult.POST_status !== speedResult.POST_status) {
      differences.push(`POST status differs: Normal=${normalResult.POST_status}, Speed=${speedResult.POST_status}`);
    }
    
    // Compare request headers
    if (normalPost && speedPost) {
      if (normalPost.requestContentType !== speedPost.requestContentType) {
        differences.push(`Content-Type differs: Normal=${normalPost.requestContentType}, Speed=${speedPost.requestContentType}`);
      }
      if (normalPost.requestId === speedPost.requestId) {
        differences.push(`X-Request-Id is same (unexpected - should be different)`);
      }
    }
    
    // Compare request body
    if (normalPost?.requestBody && speedPost?.requestBody) {
      if (normalPost.requestBody.text !== speedPost.requestBody.text) {
        differences.push(`Request body text differs (expected - different content)`);
      }
      if (normalPost.requestBody.hash === speedPost.requestBody.hash) {
        differences.push(`Request body hash is same (unexpected - different text should have different hash)`);
      }
    }
    
    // Compare endpoints
    if (normalPost && speedPost) {
      const normalUrl = new URL(normalPost.url);
      const speedUrl = new URL(speedPost.url);
      if (normalUrl.pathname !== speedUrl.pathname) {
        differences.push(`Endpoint differs: Normal=${normalUrl.pathname}, Speed=${speedUrl.pathname}`);
      }
    }
    
    // Compare errors
    if (normalResult.any_errors !== 'none' && speedResult.any_errors === 'none') {
      differences.push(`Error only in Normal: ${normalResult.any_errors}`);
    } else if (normalResult.any_errors === 'none' && speedResult.any_errors !== 'none') {
      differences.push(`Error only in Speed: ${speedResult.any_errors}`);
    } else if (normalResult.any_errors !== 'none' && speedResult.any_errors !== 'none') {
      if (normalResult.any_errors !== speedResult.any_errors) {
        differences.push(`Different errors: Normal=${normalResult.any_errors}, Speed=${speedResult.any_errors}`);
      }
    }
    
    // Compare Access-Control-Request-Headers
    if (normalResult.Access_Control_Request_Headers !== speedResult.Access_Control_Request_Headers) {
      differences.push(`Access-Control-Request-Headers differs: Normal=${normalResult.Access_Control_Request_Headers}, Speed=${speedResult.Access_Control_Request_Headers}`);
    }
    
    // Output formatted result
    console.log('PHASE3_RESULT:');
    console.log(`- Normal: {OPTIONS_status: ${normalResult.OPTIONS_status}, POST_status: ${normalResult.POST_status}, Access-Control-Request-Headers: ${normalResult.Access_Control_Request_Headers}, any errors: ${normalResult.any_errors}}`);
    console.log(`- SpeedChanged: {OPTIONS_status: ${speedResult.OPTIONS_status}, POST_status: ${speedResult.POST_status}, Access-Control-Request-Headers: ${speedResult.Access_Control_Request_Headers}, any errors: ${speedResult.any_errors}}`);
    console.log('- Diff_summary:');
    if (differences.length === 0) {
      console.log('  • No significant differences found');
    } else {
      differences.forEach(diff => console.log(`  • ${diff}`));
    }
    console.log('');
    
    // Copy to clipboard
    const text = `PHASE3_RESULT:
- Normal: {OPTIONS_status: ${normalResult.OPTIONS_status}, POST_status: ${normalResult.POST_status}, Access-Control-Request-Headers: ${normalResult.Access_Control_Request_Headers}, any errors: ${normalResult.any_errors}}
- SpeedChanged: {OPTIONS_status: ${speedResult.OPTIONS_status}, POST_status: ${speedResult.POST_status}, Access-Control-Request-Headers: ${speedResult.Access_Control_Request_Headers}, any errors: ${speedResult.any_errors}}
- Diff_summary:
${differences.length === 0 ? '  • No significant differences found' : differences.map(d => `  • ${d}`).join('\n')}`;
    
    navigator.clipboard.writeText(text).then(() => {
      console.log('✅ Results copied to clipboard!');
    }).catch(() => {
      console.log('⚠️  Could not copy to clipboard, but results are above');
    });
    
    return {
      normal: normalResult,
      speedChanged: speedResult,
      differences
    };
  };
  
  // View captured data
  window.viewNormalCapture = function() {
    console.log('📊 Normal Capture:', normalCapture);
    return normalCapture;
  };
  
  window.viewSpeedChangeCapture = function() {
    console.log('📊 Speed Change Capture:', speedChangeCapture);
    return speedChangeCapture;
  };
  
  console.log('✅ Fetch interceptor installed');
  console.log('');
  console.log('📝 Usage:');
  console.log('   1. startNormalCapture() - Start capturing normal playback');
  console.log('   2. Trigger normal playback (click "Hear AI")');
  console.log('   3. stopCapture() - Stop capture (or wait 10 seconds)');
  console.log('   4. startSpeedChangeCapture() - Start capturing speed change');
  console.log('   5. Change speed slider and release');
  console.log('   6. stopCapture() - Stop capture (or wait 10 seconds)');
  console.log('   7. compareScenarios() - Compare the two scenarios');
  console.log('');
  console.log('💡 Helper functions:');
  console.log('   - viewNormalCapture() - View normal capture data');
  console.log('   - viewSpeedChangeCapture() - View speed change capture data');
})();

