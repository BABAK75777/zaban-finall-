/**
 * Phase 0: Baseline Evidence Capture Script
 * 
 * هدف: ثبت دقیق Baseline برای مقایسه‌های بعدی
 * 
 * دستورالعمل:
 * 1. Chrome DevTools را باز کن (F12)
 * 2. به Console tab برو
 * 3. این اسکریپت را paste کن و Enter بزن
 * 4. دستورات را یکی یکی اجرا کن
 */

(function() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 Phase 0: Baseline Evidence Capture');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  let baselineData = {
    normal: {
      name: 'Normal Playback',
      requests: [],
      consoleErrors: [],
      startTime: null,
      endTime: null
    },
    speedChanged: {
      name: 'Speed Changed Playback',
      requests: [],
      consoleErrors: [],
      startTime: null,
      endTime: null
    }
  };
  
  let currentCapture = null;
  let originalFetch = window.fetch;
  let originalConsoleError = console.error;
  
  // Capture console errors
  console.error = function(...args) {
    if (currentCapture) {
      const errorMsg = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message + ' | ' + arg.stack;
        return JSON.stringify(arg);
      }).join(' ');
      
      if (errorMsg.toLowerCase().includes('tts') || 
          errorMsg.toLowerCase().includes('cors') ||
          errorMsg.toLowerCase().includes('fetch') ||
          errorMsg.toLowerCase().includes('network')) {
        currentCapture.consoleErrors.push({
          message: errorMsg,
          timestamp: new Date().toISOString(),
          stack: args.find(a => a instanceof Error)?.stack
        });
        console.log('🚨 [ERROR CAPTURED]', errorMsg);
      }
    }
    originalConsoleError.apply(console, args);
  };
  
  // Intercept fetch to capture all TTS requests
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    if (typeof url === 'string' && url.includes('/tts') && currentCapture) {
      const requestInfo = {
        url: url,
        method: options.method || 'GET',
        headers: {},
        body: null,
        timestamp: new Date().toISOString()
      };
      
      // Extract headers
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            requestInfo.headers[key.toLowerCase()] = value;
          });
        } else if (typeof options.headers === 'object') {
          Object.keys(options.headers).forEach(key => {
            requestInfo.headers[key.toLowerCase()] = options.headers[key];
          });
        }
      }
      
      // Extract body
      if (options.body) {
        if (typeof options.body === 'string') {
          try {
            requestInfo.body = JSON.parse(options.body);
          } catch (e) {
            requestInfo.body = { raw: options.body.substring(0, 200) };
          }
        } else {
          requestInfo.body = options.body;
        }
      }
      
      console.log(`📡 [${currentCapture.name}] Request captured:`, {
        method: requestInfo.method,
        url: requestInfo.url,
        hasBody: !!requestInfo.body
      });
      
      // Make actual request and capture response
      const fetchPromise = originalFetch.apply(this, args);
      
      fetchPromise.then(async (response) => {
        const responseInfo = {
          ...requestInfo,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {}
        };
        
        // Extract all response headers
        response.headers.forEach((value, key) => {
          responseInfo.headers[key.toLowerCase()] = value;
        });
        
        // Try to parse response body
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          try {
            const clone = response.clone();
            const jsonData = await clone.json();
            responseInfo.responseBody = jsonData;
            responseInfo.hasAudioBase64 = 'audioBase64' in jsonData;
            if (responseInfo.hasAudioBase64) {
              responseInfo.audioBase64Length = jsonData.audioBase64 ? jsonData.audioBase64.length : 0;
            }
          } catch (e) {
            responseInfo.responseBody = { parseError: e.message };
          }
        } else if (contentType.includes('audio/')) {
          responseInfo.responseBody = { type: 'binary', contentType: contentType };
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            responseInfo.contentLength = parseInt(contentLength, 10);
          }
        }
        
        currentCapture.requests.push(responseInfo);
        console.log(`✅ [${currentCapture.name}] Response captured:`, {
          method: responseInfo.method,
          status: responseInfo.status,
          url: responseInfo.url
        });
      }).catch((error) => {
        const errorInfo = {
          ...requestInfo,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack
          },
          status: 'failed'
        };
        currentCapture.requests.push(errorInfo);
        console.error(`❌ [${currentCapture.name}] Request failed:`, errorInfo);
      });
      
      return fetchPromise;
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Start capturing normal playback
  window.startNormalCapture = function() {
    console.log('🎬 Starting Normal Playback Capture...');
    console.log('   → حالا دکمه "Hear AI" را بزن (بدون تغییر speed)');
    console.log('');
    
    baselineData.normal.requests = [];
    baselineData.normal.consoleErrors = [];
    baselineData.normal.startTime = Date.now();
    currentCapture = baselineData.normal;
    
    setTimeout(() => {
      if (currentCapture === baselineData.normal) {
        baselineData.normal.endTime = Date.now();
        console.log('⏹️  Normal capture completed');
        console.log(`   Requests: ${baselineData.normal.requests.length}`);
        console.log(`   Errors: ${baselineData.normal.consoleErrors.length}`);
      }
    }, 15000);
  };
  
  // Start capturing speed change playback
  window.startSpeedChangeCapture = function() {
    console.log('🎬 Starting Speed Change Capture...');
    console.log('   → حالا speed slider را تغییر بده و رها کن');
    console.log('');
    
    baselineData.speedChanged.requests = [];
    baselineData.speedChanged.consoleErrors = [];
    baselineData.speedChanged.startTime = Date.now();
    currentCapture = baselineData.speedChanged;
    
    setTimeout(() => {
      if (currentCapture === baselineData.speedChanged) {
        baselineData.speedChanged.endTime = Date.now();
        console.log('⏹️  Speed change capture completed');
        console.log(`   Requests: ${baselineData.speedChanged.requests.length}`);
        console.log(`   Errors: ${baselineData.speedChanged.consoleErrors.length}`);
      }
    }, 15000);
  };
  
  // Stop current capture
  window.stopCapture = function() {
    if (currentCapture) {
      currentCapture.endTime = Date.now();
      console.log(`⏹️  ${currentCapture.name} capture stopped`);
      currentCapture = null;
    }
  };
  
  // Generate Phase 0 report
  window.generatePhase0Report = function() {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 PHASE 0 BASELINE REPORT');
    console.log('═══════════════════════════════════════');
    console.log('');
    
    function analyzeScenario(scenario) {
      const options = scenario.requests.find(r => r.method === 'OPTIONS');
      const post = scenario.requests.find(r => r.method === 'POST');
      
      return {
        OPTIONS_seen: options ? 'yes' : 'no',
        OPTIONS_status: options ? (options.status || options.error ? 'failed' : 'N/A') : 'N/A',
        'A-C-Allow-Headers': options?.headers?.['access-control-allow-headers'] || 
                            (options?.headers?.['Access-Control-Allow-Headers']) || 'N/A',
        POST_seen: post ? 'yes' : 'no',
        POST_status: post ? (post.status || (post.error ? 'failed' : 'N/A')) : 'N/A',
        Content_Type: post?.headers?.['content-type'] || 'N/A',
        has_audioBase64: post?.hasAudioBase64 ? 'yes' : 'no',
        audioBase64_length: post?.audioBase64Length || 0,
        console_error_summary: scenario.consoleErrors.length > 0 
          ? `${scenario.consoleErrors.length} error(s): ${scenario.consoleErrors.map(e => e.message.substring(0, 50)).join('; ')}`
          : 'none'
      };
    }
    
    const normalResult = analyzeScenario(baselineData.normal);
    const speedResult = analyzeScenario(baselineData.speedChanged);
    
    // Find differences
    const differences = [];
    
    if (normalResult.OPTIONS_seen !== speedResult.OPTIONS_seen) {
      differences.push(`OPTIONS_seen differs: Normal=${normalResult.OPTIONS_seen}, Speed=${speedResult.OPTIONS_seen}`);
    }
    if (normalResult.OPTIONS_status !== speedResult.OPTIONS_status) {
      differences.push(`OPTIONS_status differs: Normal=${normalResult.OPTIONS_status}, Speed=${speedResult.OPTIONS_status}`);
    }
    if (normalResult['A-C-Allow-Headers'] !== speedResult['A-C-Allow-Headers']) {
      differences.push(`A-C-Allow-Headers differs: Normal=${normalResult['A-C-Allow-Headers']}, Speed=${speedResult['A-C-Allow-Headers']}`);
    }
    if (normalResult.POST_seen !== speedResult.POST_seen) {
      differences.push(`POST_seen differs: Normal=${normalResult.POST_seen}, Speed=${speedResult.POST_seen}`);
    }
    if (normalResult.POST_status !== speedResult.POST_status) {
      differences.push(`POST_status differs: Normal=${normalResult.POST_status}, Speed=${speedResult.POST_status}`);
    }
    if (normalResult.Content_Type !== speedResult.Content_Type) {
      differences.push(`Content-Type differs: Normal=${normalResult.Content_Type}, Speed=${speedResult.Content_Type}`);
    }
    if (normalResult.has_audioBase64 !== speedResult.has_audioBase64) {
      differences.push(`has_audioBase64 differs: Normal=${normalResult.has_audioBase64}, Speed=${speedResult.has_audioBase64}`);
    }
    if (normalResult.console_error_summary !== speedResult.console_error_summary) {
      differences.push(`Console errors differ: Normal=${normalResult.console_error_summary}, Speed=${speedResult.console_error_summary}`);
    }
    
    // Format output
    const report = `PHASE0_BASELINE:
- Normal: {OPTIONS_seen: ${normalResult.OPTIONS_seen}, OPTIONS_status: ${normalResult.OPTIONS_status}, A-C-Allow-Headers: ${normalResult['A-C-Allow-Headers']}, POST_seen: ${normalResult.POST_seen}, POST_status: ${normalResult.POST_status}, Content-Type: ${normalResult.Content_Type}, has_audioBase64: ${normalResult.has_audioBase64}, audioBase64_length: ${normalResult.audioBase64_length}, console_error_summary: ${normalResult.console_error_summary}}
- SpeedChanged: {OPTIONS_seen: ${speedResult.OPTIONS_seen}, OPTIONS_status: ${speedResult.OPTIONS_status}, A-C-Allow-Headers: ${speedResult['A-C-Allow-Headers']}, POST_seen: ${speedResult.POST_seen}, POST_status: ${speedResult.POST_status}, Content-Type: ${speedResult.Content_Type}, has_audioBase64: ${speedResult.has_audioBase64}, audioBase64_length: ${speedResult.audioBase64_length}, console_error_summary: ${speedResult.console_error_summary}}
- Diff: ${differences.length > 0 ? differences.map(d => `\n  • ${d}`).join('') : '\n  • No differences found'}`;
    
    console.log(report);
    console.log('');
    
    // Copy to clipboard
    navigator.clipboard.writeText(report).then(() => {
      console.log('✅ Report copied to clipboard!');
    }).catch(() => {
      console.log('⚠️  Could not copy to clipboard');
    });
    
    return {
      normal: normalResult,
      speedChanged: speedResult,
      differences
    };
  };
  
  // View detailed data
  window.viewNormalData = function() {
    console.log('📊 Normal Playback Data:', baselineData.normal);
    return baselineData.normal;
  };
  
  window.viewSpeedChangeData = function() {
    console.log('📊 Speed Change Data:', baselineData.speedChanged);
    return baselineData.speedChanged;
  };
  
  console.log('✅ Script loaded successfully!');
  console.log('');
  console.log('📝 دستورالعمل:');
  console.log('   1. startNormalCapture() - شروع ثبت Normal playback');
  console.log('   2. دکمه "Hear AI" را بزن (بدون تغییر speed)');
  console.log('   3. stopCapture() - توقف ثبت');
  console.log('   4. startSpeedChangeCapture() - شروع ثبت Speed change');
  console.log('   5. Speed slider را تغییر بده و رها کن');
  console.log('   6. stopCapture() - توقف ثبت');
  console.log('   7. generatePhase0Report() - تولید گزارش');
  console.log('');
  console.log('💡 Helper functions:');
  console.log('   - viewNormalData() - مشاهده داده‌های Normal');
  console.log('   - viewSpeedChangeData() - مشاهده داده‌های Speed change');
})();

