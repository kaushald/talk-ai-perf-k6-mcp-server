/**
 * Basic K6 test script generator
 * Generates K6 scripts with various scenario types (ramping, spike, stress, soak)
 */

export function generateBasicScript(options = {}) {
  const {
    baseUrl = 'http://localhost:3000',
    vus = 10,
    duration = '2m',
    thinkTime = 1,
    scenarioType = 'ramping',
    timestamp = new Date().toISOString()
  } = options;

  const stagesConfig = generateStagesConfig(scenarioType, vus, duration);
  
  return `// Generated K6 test script
// Generated at: ${timestamp}
// Source: Basic template
// Scenario: ${scenarioType}
// Configuration: ${vus} VUs, ${duration} duration, ${thinkTime}s think time

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('successful_requests');
const apiTrend = new Trend('api_duration', true);

// Test configuration
export const options = {
  stages: ${stagesConfig},
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // Response time thresholds
    'http_req_failed': ['rate<0.1'],                    // Error rate < 10%
    'errors': ['rate<0.1'],                             // Custom error rate < 10%
    'successful_requests': ['rate>0.9'],                // Success rate > 90%
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || '${baseUrl}';
const THINK_TIME = __ENV.THINK_TIME || ${thinkTime};

// Helper function for random think time (±50% variation)
function randomThinkTime() {
  const min = THINK_TIME * 0.5;
  const max = THINK_TIME * 1.5;
  return Math.random() * (max - min) + min;
}

// Main test scenario
export default function () {
  // Group 1: Homepage and basic navigation
  group('Homepage', function () {
    const homeRes = http.get(\`\${BASE_URL}/\`, {
      tags: { name: 'Homepage' },
    });
    
    const homeCheck = check(homeRes, {
      'homepage status is 200': (r) => r.status === 200,
      'homepage loads quickly': (r) => r.timings.duration < 500,
      'homepage has content': (r) => r.body && r.body.length > 0,
    });
    
    if (!homeCheck) {
      errorRate.add(1);
    } else {
      successRate.add(1);
    }
    
    apiTrend.add(homeRes.timings.duration);
  });
  
  sleep(randomThinkTime());
  
  // Group 2: API endpoints (if applicable)
  group('API Endpoints', function () {
    // Test common API endpoints
    const endpoints = [
      { path: '/api/health', name: 'Health Check' },
      { path: '/api/products', name: 'Products List' },
      { path: '/api/users', name: 'Users List' },
    ];
    
    endpoints.forEach(endpoint => {
      const res = http.get(\`\${BASE_URL}\${endpoint.path}\`, {
        tags: { name: endpoint.name },
      });
      
      const checkResult = check(res, {
        [\`\${endpoint.name} status ok\`]: (r) => r.status === 200 || r.status === 404,
        [\`\${endpoint.name} response time ok\`]: (r) => r.timings.duration < 1000,
      });
      
      if (!checkResult || res.status >= 400) {
        errorRate.add(1);
      } else {
        successRate.add(1);
      }
      
      apiTrend.add(res.timings.duration, { endpoint: endpoint.name });
      
      sleep(randomThinkTime() * 0.5); // Shorter pause between API calls
    });
  });
  
  sleep(randomThinkTime());
  
  // Group 3: Simulated user journey
  group('User Journey', function () {
    // Simulate a more complex user interaction
    const searchRes = http.get(\`\${BASE_URL}/search?q=test\`, {
      tags: { name: 'Search' },
    });
    
    check(searchRes, {
      'search works': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);
    
    // Add more interactions as needed based on the application
  });
  
  // Final think time before next iteration
  sleep(randomThinkTime());
}

${generateSummaryHandler(scenarioType, vus, duration)}`;
}

/**
 * Generate stages configuration based on scenario type
 */
function generateStagesConfig(scenarioType, vus, duration) {
  switch (scenarioType) {
    case 'spike':
      return `[
    { duration: '30s', target: ${vus} },      // Ramp up
    { duration: '1m', target: ${vus} },       // Stay at normal load
    { duration: '10s', target: ${vus * 3} },  // Spike to 3x load
    { duration: '1m', target: ${vus * 3} },   // Stay at spike
    { duration: '10s', target: ${vus} },      // Back to normal
    { duration: '1m', target: ${vus} },       // Stay at normal
    { duration: '30s', target: 0 },           // Ramp down
  ]`;
    
    case 'stress':
      return `[
    { duration: '1m', target: ${vus} },       // Ramp up to normal
    { duration: '2m', target: ${vus} },       // Stay at normal
    { duration: '1m', target: ${vus * 2} },   // Ramp to 2x
    { duration: '2m', target: ${vus * 2} },   // Stay at 2x
    { duration: '1m', target: ${vus * 3} },   // Ramp to 3x
    { duration: '2m', target: ${vus * 3} },   // Stay at 3x
    { duration: '1m', target: 0 },            // Ramp down
  ]`;
    
    case 'soak':
      return `[
    { duration: '2m', target: ${vus} },       // Ramp up
    { duration: '${duration}', target: ${vus} }, // Stay at target (long duration)
    { duration: '2m', target: 0 },            // Ramp down
  ]`;
    
    default: // ramping
      return `[
    { duration: '30s', target: ${Math.floor(vus/2)} }, // Ramp to 50%
    { duration: '30s', target: ${vus} },               // Ramp to 100%
    { duration: '${duration}', target: ${vus} },       // Stay at target
    { duration: '30s', target: 0 },                    // Ramp down
  ]`;
  }
}

/**
 * Generate custom summary handler
 */
function generateSummaryHandler(scenarioType, vus, duration) {
  return `// Custom summary handler
export function handleSummary(data) {
  const { metrics } = data;
  let summary = '\\n=== Test Summary ===\\n\\n';
  summary += \`Scenario: ${scenarioType}\\n\`;
  summary += \`Target VUs: ${vus}\\n\`;
  summary += \`Duration: ${duration}\\n\\n\`;
  
  // Request metrics
  if (metrics.http_reqs) {
    summary += \`Total Requests: \${metrics.http_reqs.values.count}\\n\`;
    summary += \`Request Rate: \${metrics.http_reqs.values.rate?.toFixed(2)}/s\\n\`;
  }
  
  // Response time metrics
  if (metrics.http_req_duration) {
    summary += \`\\nResponse Times:\\n\`;
    summary += \`  Median: \${metrics.http_req_duration.values['p(50)']?.toFixed(2)}ms\\n\`;
    summary += \`  95th percentile: \${metrics.http_req_duration.values['p(95)']?.toFixed(2)}ms\\n\`;
    summary += \`  99th percentile: \${metrics.http_req_duration.values['p(99)']?.toFixed(2)}ms\\n\`;
  }
  
  // Error metrics
  if (metrics.errors) {
    summary += \`\\nError Rate: \${(metrics.errors.values.rate * 100).toFixed(2)}%\\n\`;
  }
  
  if (metrics.successful_requests) {
    summary += \`Success Rate: \${(metrics.successful_requests.values.rate * 100).toFixed(2)}%\\n\`;
  }
  
  // Threshold results
  summary += '\\nThreshold Results:\\n';
  for (const [name, metric] of Object.entries(metrics)) {
    if (metric.thresholds) {
      const passed = Object.values(metric.thresholds).every(t => t.ok);
      summary += \`  \${name}: \${passed ? '✓ PASS' : '✗ FAIL'}\\n\`;
    }
  }
  
  return {
    'stdout': summary,
    'summary.json': JSON.stringify(data),
  };
}`;
}