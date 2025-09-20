/**
 * K6 Output Handler
 * Handles fetching output from K6 tests
 */

import chalk from 'chalk';
import axios from 'axios';
import { checkAppServer, getApiBaseUrl } from '../utils/appServerCheck.js';

const API_BASE = getApiBaseUrl();

// Tool configuration
export const outputToolConfig = {
  title: 'K6 Test Output',
  description: 'Get the output from a running or completed K6 test',
  inputSchema: {
    testId: {
      description: 'Test ID to get output for'
    },
    tail: {
      description: 'Number of lines to show from the end (default: all)'
    },
    follow: {
      description: 'Follow output in real-time (for running tests)'
    }
  }
};

/**
 * Handle K6 test output retrieval
 */
export async function handleOutput(args) {
  const { testId, tail, follow } = args;
  
  try {
    // Check if App Server is available
    const serverAvailable = await checkAppServer();
    if (!serverAvailable) {
      throw new Error('K6 App Server is not available. Please start it with: cd k6-app-server && npm start');
    }
    
    console.error(chalk.blue(`📝 Fetching output for test ${testId}...`));
    
    const response = await axios.get(`${API_BASE}/${testId}/output`, {
      params: { tail, follow }
    });
    
    return formatOutput(response.data, testId);
  } catch (error) {
    console.error(chalk.red('Error getting output:'), error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to get test output',
            message: error.response?.data?.error || error.message,
            testId,
            hint: error.response?.status === 404 ? 
              `Test ${testId} not found. Use k6_status to list available tests.` :
              error.message.includes('App Server') ? 
                'Start the K6 App Server with: cd k6-app-server && npm start' : undefined
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Format output for better readability
 */
function formatOutput(data, testId) {
  const { output, errorOutput, status, metrics, summary } = data;
  
  // Build formatted output
  let formattedOutput = '';
  
  // Add header
  formattedOutput += '═'.repeat(60) + '\n';
  formattedOutput += `Test ID: ${testId}\n`;
  formattedOutput += `Status: ${status}\n`;
  formattedOutput += '═'.repeat(60) + '\n\n';
  
  // Add metrics summary if available
  if (metrics) {
    formattedOutput += '📊 Quick Metrics:\n';
    formattedOutput += '─'.repeat(40) + '\n';
    if (metrics.http_reqs) {
      formattedOutput += `• Requests: ${metrics.http_reqs}\n`;
    }
    if (metrics.http_req_duration) {
      formattedOutput += `• Avg Response Time: ${metrics.http_req_duration}ms\n`;
    }
    if (metrics.http_req_failed) {
      formattedOutput += `• Error Rate: ${metrics.http_req_failed}%\n`;
    }
    formattedOutput += '\n';
  }
  
  // Add standard output
  if (output) {
    formattedOutput += '📝 Standard Output:\n';
    formattedOutput += '─'.repeat(40) + '\n';
    
    // Limit output size to prevent overwhelming the display
    const maxOutputLength = 10000;
    if (output.length > maxOutputLength) {
      formattedOutput += '... (output truncated) ...\n';
      formattedOutput += output.slice(-maxOutputLength);
    } else {
      formattedOutput += output;
    }
    
    if (!output.endsWith('\n')) {
      formattedOutput += '\n';
    }
  }
  
  // Add error output if present
  if (errorOutput && errorOutput.trim()) {
    formattedOutput += '\n';
    formattedOutput += '❌ Error Output:\n';
    formattedOutput += '─'.repeat(40) + '\n';
    formattedOutput += errorOutput;
    
    if (!errorOutput.endsWith('\n')) {
      formattedOutput += '\n';
    }
  }
  
  // Add summary if available and test is completed
  if (summary && status === 'completed') {
    formattedOutput += '\n';
    formattedOutput += '✅ Test Summary:\n';
    formattedOutput += '─'.repeat(40) + '\n';
    formattedOutput += formatSummary(summary);
  }
  
  // Add footer
  formattedOutput += '\n' + '═'.repeat(60);
  
  return {
    content: [
      {
        type: 'text',
        text: formattedOutput
      }
    ]
  };
}

/**
 * Format test summary
 */
function formatSummary(summary) {
  let formatted = '';
  
  if (typeof summary === 'string') {
    return summary;
  }
  
  if (summary.checks) {
    formatted += `• Checks Passed: ${summary.checks.passed}/${summary.checks.total}\n`;
  }
  
  if (summary.thresholds) {
    formatted += `• Thresholds: ${summary.thresholds.passed ? '✓ All passed' : '✗ Some failed'}\n`;
  }
  
  if (summary.duration) {
    formatted += `• Duration: ${summary.duration}\n`;
  }
  
  if (summary.data_received) {
    formatted += `• Data Received: ${summary.data_received}\n`;
  }
  
  if (summary.data_sent) {
    formatted += `• Data Sent: ${summary.data_sent}\n`;
  }
  
  return formatted || JSON.stringify(summary, null, 2);
}