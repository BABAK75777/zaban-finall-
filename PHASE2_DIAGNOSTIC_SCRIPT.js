/**
 * Phase 2 Diagnostic Script - POST /tts Request Analysis
 * 
 * Instructions:
 * 1. Open Chrome DevTools (F12)
 * 2. Go to Console tab
 * 3. Paste this entire script and press Enter
 * 4. Trigger the TTS request (play or speed change)
 * 5. Wait a moment, then call: analyzePostTtsRequest()
 * 
 * OR use the automatic analyzer that watches for requests
 */

(function() {
  console.log('🔍 Phase 2 Diagnostic Script Loaded');
  console.log('📋 This script will help analyze POST /tts requests');
  console.log('');
  
  let capturedRequests = [];
  
  // Intercept fetch to capture TTS requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    if (typeof url === 'string' && url.includes('/tts') && (options.method === 'POST' || !options.method)) {
      const requestInfo = {
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔍 TTS Request Detected:', url);
      console.log('   Method:', requestInfo.method);
      console.log('   Headers:', requestInfo.headers);
      
      // Make the actual request and capture response
      const fetchPromise = originalFetch.apply(this, args);
      
      fetchPromise.then(async (response) => {
        const responseInfo = {
          ...requestInfo,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          ok: response.ok
        };
        
        // Try to determine body type
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          try {
            const clone = response.clone(); // Clone to avoid consuming the response
            const jsonData = await clone.json();
            responseInfo.bodyType = 'JSON';
            responseInfo.jsonKeys = Object.keys(jsonData);
            responseInfo.hasAudioBase64 = 'audioBase64' in jsonData;
            responseInfo.hasAudioContent = 'audioContent' in jsonData;
            responseInfo.hasInlineData = 'inlineData' in jsonData;
            responseInfo.hasMimeType = 'mimeType' in jsonData;
            responseInfo.jsonData = jsonData;
          } catch (e) {
            responseInfo.bodyType = 'JSON (parse error)';
            responseInfo.parseError = e.message;
          }
        } else if (contentType.includes('audio/')) {
          responseInfo.bodyType = 'binary';
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const bytes = parseInt(contentLength, 10);
            const kb = (bytes / 1024).toFixed(2);
            const mb = (bytes / (1024 * 1024)).toFixed(2);
            responseInfo.size = `${kb} KB (${mb} MB)`;
          }
        } else {
          responseInfo.bodyType = 'unknown';
        }
        
        capturedRequests.push(responseInfo);
        console.log('📥 Response Captured:', responseInfo);
        
        // Auto-format if this is the first/only request
        if (capturedRequests.length === 1) {
          setTimeout(() => {
            console.log('');
            console.log('💡 Auto-formatting result...');
            formatPhase2Result(responseInfo);
          }, 100);
        }
      }).catch((error) => {
        const errorInfo = {
          ...requestInfo,
          error: error.message,
          status: 'failed'
        };
        capturedRequests.push(errorInfo);
        console.error('❌ Request Failed:', errorInfo);
      });
      
      return fetchPromise;
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Function to analyze the most recent POST /tts request
  window.analyzePostTtsRequest = function() {
    const postRequests = capturedRequests.filter(r => r.method === 'POST' || r.url.includes('/tts'));
    
    if (postRequests.length === 0) {
      console.log('⚠️  No POST /tts requests captured yet.');
      console.log('   Make sure to trigger the TTS request first.');
      return null;
    }
    
    const latest = postRequests[postRequests.length - 1];
    formatPhase2Result(latest);
    return latest;
  };
  
  // Function to format results in the required format
  window.formatPhase2Result = function(requestInfo) {
    const result = {
      POST_seen: requestInfo ? 'yes' : 'no',
      POST_status: requestInfo?.status || requestInfo?.error ? 'failed' : 'N/A',
      Content_Type: requestInfo?.contentType || 'N/A',
      Body_type: requestInfo?.bodyType || 'N/A',
      Keys_or_binary_info: 'N/A',
      Notes: ''
    };
    
    // Format status
    if (requestInfo?.status) {
      result.POST_status = requestInfo.status.toString();
    } else if (requestInfo?.error) {
      result.POST_status = 'failed';
      result.Notes = `Error: ${requestInfo.error}`;
    }
    
    // Format body info
    if (requestInfo?.bodyType === 'JSON') {
      const keys = requestInfo.jsonKeys || [];
      const audioFields = [];
      if (requestInfo.hasAudioBase64) audioFields.push('audioBase64');
      if (requestInfo.hasAudioContent) audioFields.push('audioContent');
      if (requestInfo.hasInlineData) audioFields.push('inlineData');
      if (requestInfo.hasMimeType) audioFields.push('mimeType');
      
      const keysStr = keys.join(', ');
      const audioStr = audioFields.length > 0 
        ? `. Audio fields: ${audioFields.join(', ')}` 
        : '. No audio fields found';
      
      result.Keys_or_binary_info = keysStr + audioStr;
    } else if (requestInfo?.bodyType === 'binary') {
      const size = requestInfo.size || 'unknown size';
      const mimeType = requestInfo.contentType || 'unknown type';
      result.Keys_or_binary_info = `${size}, ${mimeType}`;
    }
    
    // Format notes
    if (!result.Notes) {
      if (requestInfo?.ok === false) {
        result.Notes = `Request failed with status ${requestInfo.status}`;
      } else if (requestInfo?.ok === true) {
        result.Notes = 'Request successful';
      } else {
        result.Notes = 'Request status unknown';
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('PHASE2_RESULT:');
    console.log(`- POST_seen: ${result.POST_seen}`);
    console.log(`- POST_status: ${result.POST_status}`);
    console.log(`- Content-Type: ${result.Content_Type}`);
    console.log(`- Body_type: ${result.Body_type}`);
    console.log(`- Keys_or_binary_info: ${result.Keys_or_binary_info}`);
    console.log(`- Notes: ${result.Notes}`);
    console.log('═══════════════════════════════════════');
    
    // Copy to clipboard
    const text = `PHASE2_RESULT:
- POST_seen: ${result.POST_seen}
- POST_status: ${result.POST_status}
- Content-Type: ${result.Content_Type}
- Body_type: ${result.Body_type}
- Keys_or_binary_info: ${result.Keys_or_binary_info}
- Notes: ${result.Notes}`;
    
    navigator.clipboard.writeText(text).then(() => {
      console.log('✅ Results copied to clipboard!');
    }).catch(() => {
      console.log('⚠️  Could not copy to clipboard, but results are above');
    });
    
    return result;
  };
  
  // Function to view all captured requests
  window.viewAllCapturedRequests = function() {
    console.log('📊 All Captured Requests:', capturedRequests);
    return capturedRequests;
  };
  
  console.log('✅ Fetch interceptor installed');
  console.log('');
  console.log('📝 Usage:');
  console.log('   1. Trigger the TTS request (play or speed change)');
  console.log('   2. Wait a moment for the request to complete');
  console.log('   3. Call: analyzePostTtsRequest()');
  console.log('');
  console.log('   Or view all captured requests: viewAllCapturedRequests()');
  console.log('');
  console.log('💡 The script will automatically try to format results when a request is detected.');
})();

