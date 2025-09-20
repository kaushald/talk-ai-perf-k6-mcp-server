/**
 * K6 Run Handler
 * Handles execution of K6 test scripts via the App Server
 */

import chalk from 'chalk';
import axios from 'axios';
import { checkAppServer } from '../utils/appServerCheck.js';

// Configuration
const APP_SERVER_URL = process.env.K6_APP_SERVER_URL || 'http://localhost:3001';
const API_BASE = `${APP_SERVER_URL}/api/tests`;

// Tool configuration
export const runToolConfig = {
  title: 'Execute K6 Test',
  description: 'Execute a K6 performance test script',
  inputSchema: {
    script: {
      description: 'Path to the K6 test script'
    },
    vus: {
      description: 'Number of virtual users (default: 10)'
    },
    duration: {
      description: 'Test duration (default: "30s")'
    },
    env: {
      description: 'Environment variables for the test'
    }
  }
};

/**
 * Handle K6 test execution
 */
export async function handleRun(args) {
  const { script, vus = 10, duration = '30s', env = {} } = args;
  
  try {
    const serverAvailable = await checkAppServer();
    if (!serverAvailable) {
      throw new Error('K6 App Server is not available. Please start it with: cd k6-app-server && npm start');
    }
    
    console.error(chalk.blue('🚀 Starting K6 test via App Server...'));
    
    const response = await axios.post(`${API_BASE}/run`, {
      script,
      vus,
      duration,
      env
    });
    
    const { testId, statusUrl, resultsUrl, outputUrl, streamUrl } = response.data;
    
    console.error(chalk.green(`✅ Test started: ${testId}`));
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'K6 test started successfully',
            test: {
              id: testId,
              status: 'running',
              script: script,
              configuration: {
                vus: vus,
                duration: duration,
                env: env
              }
            },
            endpoints: {
              status: `${APP_SERVER_URL}${statusUrl}`,
              results: `${APP_SERVER_URL}${resultsUrl}`,
              output: `${APP_SERVER_URL}${outputUrl}`,
              stream: `${APP_SERVER_URL}${streamUrl}`
            }
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error(chalk.red('Error starting test:'), error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to start K6 test',
            message: error.response?.data?.error || error.message,
            script,
            hint: error.message.includes('App Server') ? 
              'Start the K6 App Server with: cd k6-app-server && npm start' : undefined
          }, null, 2)
        }
      ]
    };
  }
}