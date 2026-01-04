/**
 * CORS Diagnostic Script
 * 
 * Instructions:
 * 1. Open Chrome DevTools (F12)
 * 2. Go to Console tab
 * 3. Paste this entire script and press Enter
 * 4. Trigger the TTS request (play or speed change)
 * 5. The results will be logged to console and copied to clipboard
 * 
 * This script intercepts fetch requests and logs CORS preflight details
 */

(function() {
  console.log('🔍 CORS Diagnostic Script Loaded');
  console.log('📋 Instructions:');
  console.log('   1. Keep this console open');
  console.log('   2. Open Network tab in DevTools');
  console.log('   3. Filter by "tts"');
  console.log('   4. Enable "Preserve log"');
  console.log('   5. Trigger the TTS request');
  console.log('   6. Check Network tab for OPTIONS request');
  console.log('');
  console.log('📊 Analyzing current CORS configuration...');
  
  // Log what headers the frontend will send
  console.log('📤 Expected Request Headers:');
  console.log('   - Content-Type: application/json');
  console.log('   - X-Request-Id: <requestId>');
  console.log('');
  
  // Intercept fetch to log request details
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    if (typeof url === 'string' && url.includes('/tts')) {
      console.log('🔍 TTS Request Detected:', url);
      console.log('   Method:', options.method || 'GET');
      console.log('   Headers:', options.headers);
      console.log('');
      console.log('⚠️  If this triggers a preflight, check Network tab for OPTIONS request');
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ Fetch interceptor installed');
  console.log('');
  console.log('📝 Manual Steps:');
  console.log('   1. Go to Network tab');
  console.log('   2. Filter: tts');
  console.log('   3. Enable Preserve log');
  console.log('   4. Trigger TTS request');
  console.log('   5. Look for OPTIONS /tts request');
  console.log('   6. Click on OPTIONS request → Headers tab');
  console.log('   7. Copy the following information:');
  console.log('');
  console.log('   FROM REQUEST HEADERS (OPTIONS):');
  console.log('   - Access-Control-Request-Headers: <value>');
  console.log('');
  console.log('   FROM RESPONSE HEADERS (OPTIONS):');
  console.log('   - access-control-allow-origin: <value>');
  console.log('   - access-control-allow-methods: <value>');
  console.log('   - access-control-allow-headers: <value>');
  console.log('   - Status Code: <value>');
  console.log('');
  console.log('   FROM POST REQUEST (if it happens):');
  console.log('   - Status Code: <value>');
  console.log('   - Error message (if any): <value>');
  console.log('');
  
  // Function to format results
  window.formatCorsResults = function(optionsData, postData) {
    const result = {
      OPTIONS_seen: optionsData ? 'yes' : 'no',
      OPTIONS_status: optionsData?.status || 'N/A',
      'A-C-Allow-Origin': optionsData?.allowOrigin || 'N/A',
      'A-C-Allow-Methods': optionsData?.allowMethods || 'N/A',
      'A-C-Allow-Headers': optionsData?.allowHeaders || 'N/A',
      'Access-Control-Request-Headers': optionsData?.requestHeaders || 'N/A',
      Notes: postData?.error || 'No errors detected'
    };
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('PHASE1_RESULT:');
    console.log(`- OPTIONS_seen: ${result.OPTIONS_seen}`);
    console.log(`- OPTIONS_status: ${result.OPTIONS_status}`);
    console.log(`- A-C-Allow-Origin: ${result['A-C-Allow-Origin']}`);
    console.log(`- A-C-Allow-Methods: ${result['A-C-Allow-Methods']}`);
    console.log(`- A-C-Allow-Headers: ${result['A-C-Allow-Headers']}`);
    console.log(`- Access-Control-Request-Headers: ${result['Access-Control-Request-Headers']}`);
    console.log(`- Notes: ${result.Notes}`);
    console.log('═══════════════════════════════════════');
    
    // Copy to clipboard
    const text = `PHASE1_RESULT:
- OPTIONS_seen: ${result.OPTIONS_seen}
- OPTIONS_status: ${result.OPTIONS_status}
- A-C-Allow-Origin: ${result['A-C-Allow-Origin']}
- A-C-Allow-Methods: ${result['A-C-Allow-Methods']}
- A-C-Allow-Headers: ${result['A-C-Allow-Headers']}
- Access-Control-Request-Headers: ${result['Access-Control-Request-Headers']}
- Notes: ${result.Notes}`;
    
    navigator.clipboard.writeText(text).then(() => {
      console.log('✅ Results copied to clipboard!');
    }).catch(() => {
      console.log('⚠️  Could not copy to clipboard, but results are above');
    });
    
    return result;
  };
  
  console.log('💡 Tip: After collecting data, call formatCorsResults(optionsData, postData) to format results');
  console.log('   Example: formatCorsResults({ status: 204, allowOrigin: "http://localhost:3000", ... }, {})');
})();

