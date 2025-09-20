/**
 * K6 Status Handler
 * Handles checking status of K6 tests
 */

import chalk from 'chalk';
import axios from 'axios';
import { checkAppServer, getApiBaseUrl } from '../utils/appServerCheck.js';

const API_BASE = getApiBaseUrl();

// Tool configuration
export const statusToolConfig = {
  title: 'K6 Test Status',
  description: 'Get the status of running and recent K6 tests',
  inputSchema: {
    testId: {
      description: 'Specific test ID to check status for'
    }
  }
};

/**
 * Handle K6 test status checking
 */
export async function handleStatus(args) {
  const { testId } = args;
  
  try {
    // Check if App Server is available
    const serverAvailable = await checkAppServer();
    if (!serverAvailable) {
      throw new Error('K6 App Server is not available. Please start it with: cd k6-app-server && npm start');
    }
    
    if (testId) {
      return await getSpecificTestStatus(testId);
    } else {
      return await getAllTestsStatus();
    }
  } catch (error) {
    console.error(chalk.red('Error getting status:'), error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to get test status',
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
 * Get specific test status
 */
async function getSpecificTestStatus(testId) {
  console.error(chalk.blue(`📊 Checking status for test ${testId}...`));
  
  try {
    const response = await axios.get(`${API_BASE}/${testId}/status`);
    
    // Add additional formatting for better readability
    const statusData = response.data;
    
    // Add human-readable duration if test is running
    if (statusData.status === 'running' && statusData.startTime) {
      const duration = Date.now() - new Date(statusData.startTime).getTime();
      statusData.runningFor = formatDuration(duration);
    }
    
    // Add completion time if test is completed
    if (statusData.status === 'completed' && statusData.startTime && statusData.endTime) {
      const duration = new Date(statusData.endTime) - new Date(statusData.startTime);
      statusData.totalDuration = formatDuration(duration);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(statusData, null, 2)
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
 * Get all tests status
 */
async function getAllTestsStatus() {
  console.error(chalk.blue('📊 Fetching all tests status...'));
  
  const response = await axios.get(`${API_BASE}/`);
  const tests = response.data.tests || [];
  
  // Enhance test data with human-readable information
  const enhancedTests = tests.map(test => {
    const enhanced = { ...test };
    
    if (test.status === 'running' && test.startTime) {
      const duration = Date.now() - new Date(test.startTime).getTime();
      enhanced.runningFor = formatDuration(duration);
    }
    
    if (test.status === 'completed' && test.duration) {
      enhanced.duration = formatDuration(test.duration);
    }
    
    return enhanced;
  });
  
  // Group tests by status
  const grouped = {
    running: enhancedTests.filter(t => t.status === 'running'),
    completed: enhancedTests.filter(t => t.status === 'completed'),
    failed: enhancedTests.filter(t => t.status === 'failed'),
    total: enhancedTests.length
  };
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          summary: {
            total: grouped.total,
            running: grouped.running.length,
            completed: grouped.completed.length,
            failed: grouped.failed.length
          },
          tests: enhancedTests,
          groupedByStatus: grouped
        }, null, 2)
      }
    ]
  };
}

/**
 * Format duration in milliseconds to human-readable format
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}