/**
 * K6 Analyze Handler
 * Handles analysis of K6 test results
 */

import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs/promises';
import { checkAppServer, getApiBaseUrl } from '../utils/appServerCheck.js';

const API_BASE = getApiBaseUrl();

// Tool configuration
export const analyzeToolConfig = {
  title: 'Analyze K6 Results',
  description: 'Analyze K6 test results and provide performance insights',
  inputSchema: {
    testId: {
      description: 'Test ID to analyze'
    },
    resultFile: {
      description: 'Path to result file to analyze'
    }
  }
};

/**
 * Handle K6 results analysis
 */
export async function handleAnalyze(args) {
  const { testId, resultFile } = args;
  
  try {
    const serverAvailable = await checkAppServer();
    
    if (testId && serverAvailable) {
      return await analyzeFromTestId(testId);
    } else if (resultFile) {
      return await analyzeFromFile(resultFile, serverAvailable);
    } else {
      throw new Error('Either testId or resultFile must be provided');
    }
  } catch (error) {
    console.error(chalk.red('Error analyzing results:'), error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to analyze K6 results',
            message: error.response?.data?.error || error.message,
            hint: error.message.includes('App Server') ? 
              'Start the K6 App Server with: cd k6-app-server && npm start' : undefined
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Analyze results from test ID
 */
async function analyzeFromTestId(testId) {
  console.error(chalk.blue('📊 Fetching test results from App Server...'));
  
  try {
    // First check if test exists and get results
    const resultsResponse = await axios.get(`${API_BASE}/${testId}/results`);
    
    if (resultsResponse.status === 202) {
      // Test still running
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              testId,
              status: 'running',
              message: resultsResponse.data.message
            }, null, 2)
          }
        ]
      };
    }
    
    // Analyze the results
    const analysisResponse = await axios.post(`${API_BASE}/analyze`, {
      testId,
      metrics: resultsResponse.data.metrics
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            testId,
            status: resultsResponse.data.status,
            metrics: analysisResponse.data.metrics,
            issues: analysisResponse.data.issues,
            recommendations: analysisResponse.data.recommendations,
            summary: analysisResponse.data.summary
          }, null, 2)
        }
      ]
    };
  } catch (apiError) {
    if (apiError.response?.status === 404) {
      throw new Error(`Test ${testId} not found`);
    }
    throw apiError;
  }
}

/**
 * Analyze results from file
 */
async function analyzeFromFile(resultFile, serverAvailable) {
  const output = await fs.readFile(resultFile, 'utf-8');
  
  // If App Server is available, use it for analysis
  if (serverAvailable) {
    const metrics = parseMetricsFromOutput(output);
    const analysisResponse = await axios.post(`${API_BASE}/analyze`, { metrics });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            source: 'file',
            file: resultFile,
            metrics: analysisResponse.data.metrics,
            issues: analysisResponse.data.issues,
            recommendations: analysisResponse.data.recommendations,
            summary: analysisResponse.data.summary
          }, null, 2)
        }
      ]
    };
  }
  
  // Fallback: Basic analysis without App Server
  const metrics = parseMetricsFromOutput(output);
  const analysis = performBasicAnalysis(metrics);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          source: 'file',
          file: resultFile,
          metrics,
          ...analysis,
          note: 'Basic analysis without App Server'
        }, null, 2)
      }
    ]
  };
}

/**
 * Parse metrics from K6 output
 */
function parseMetricsFromOutput(output) {
  const lines = output.split('\n');
  const metrics = {};
  
  for (const line of lines) {
    if (line.includes('http_req_duration')) {
      const match = line.match(/avg=([0-9.]+)ms.*p\(95\)=([0-9.]+)ms.*p\(99\)=([0-9.]+)ms/);
      if (match) {
        metrics.avgResponseTime = parseFloat(match[1]);
        metrics.p95ResponseTime = parseFloat(match[2]);
        metrics.p99ResponseTime = parseFloat(match[3]);
      }
    }
    if (line.includes('http_reqs')) {
      const match = line.match(/([0-9.]+)\/s/);
      if (match) {
        metrics.requestsPerSecond = parseFloat(match[1]);
      }
    }
    if (line.includes('http_req_failed')) {
      const match = line.match(/([0-9.]+)%/);
      if (match) {
        metrics.errorRate = parseFloat(match[1]);
      }
    }
    if (line.includes('http_req_waiting')) {
      const match = line.match(/avg=([0-9.]+)ms/);
      if (match) {
        metrics.avgWaitTime = parseFloat(match[1]);
      }
    }
    if (line.includes('http_req_connecting')) {
      const match = line.match(/avg=([0-9.]+)ms/);
      if (match) {
        metrics.avgConnectTime = parseFloat(match[1]);
      }
    }
  }
  
  return metrics;
}

/**
 * Perform basic analysis without App Server
 */
function performBasicAnalysis(metrics) {
  const issues = [];
  const recommendations = [];
  
  // Check response times
  if (metrics.p95ResponseTime > 1000) {
    issues.push({
      severity: 'high',
      metric: 'p95ResponseTime',
      value: metrics.p95ResponseTime,
      threshold: 1000,
      description: 'P95 response time exceeds 1 second'
    });
    recommendations.push('Optimize slow endpoints or database queries');
  }
  
  // Check error rate
  if (metrics.errorRate > 1) {
    issues.push({
      severity: 'critical',
      metric: 'errorRate',
      value: metrics.errorRate,
      threshold: 1,
      description: 'Error rate exceeds 1%'
    });
    recommendations.push('Investigate and fix failing requests');
  }
  
  // Check connection time
  if (metrics.avgConnectTime > 100) {
    issues.push({
      severity: 'medium',
      metric: 'avgConnectTime',
      value: metrics.avgConnectTime,
      threshold: 100,
      description: 'Connection time is high'
    });
    recommendations.push('Consider connection pooling or CDN');
  }
  
  // Generate summary
  const summary = {
    performance: metrics.p95ResponseTime < 500 ? 'excellent' : 
                 metrics.p95ResponseTime < 1000 ? 'good' : 
                 metrics.p95ResponseTime < 2000 ? 'fair' : 'poor',
    reliability: metrics.errorRate < 0.1 ? 'excellent' :
                 metrics.errorRate < 1 ? 'good' :
                 metrics.errorRate < 5 ? 'fair' : 'poor',
    throughput: metrics.requestsPerSecond > 100 ? 'high' :
                metrics.requestsPerSecond > 50 ? 'medium' : 'low'
  };
  
  return {
    issues,
    recommendations,
    summary
  };
}