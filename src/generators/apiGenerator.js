/**
 * API K6 test script generator
 * Generates K6 scripts for API testing
 */

export function generateApiScript(options = {}) {
  const {
    baseUrl = 'http://localhost:3000',
    vus = 10,
    duration = '1m',
    thinkTime = 1,
    endpoints = ['/api/products', '/api/users', '/api/orders'],
    timestamp = new Date().toISOString()
  } = options;

  return `// Generated K6 API test script
// Generated at: ${timestamp}
// Target: ${baseUrl}
// Configuration: ${vus} VUs, ${duration} duration

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  vus: ${vus},
  duration: '${duration}',
  thresholds: {
    errors: ['rate<0.1'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || '${baseUrl}';
const THINK_TIME = __ENV.THINK_TIME || ${thinkTime};

export default function () {
  // Test endpoints
  const endpoints = ${JSON.stringify(endpoints, null, 2).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')};
  
  for (const endpoint of endpoints) {
    const res = http.get(\`\${BASE_URL}\${endpoint}\`);
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    if (!success) {
      errorRate.add(1);
    }
    
    sleep(Math.random() * THINK_TIME * 2 + THINK_TIME * 0.5);
  }
}`;
}