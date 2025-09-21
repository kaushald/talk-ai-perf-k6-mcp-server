/**
 * K6 List Handler
 * Handles listing of available K6 test scripts via App Server
 */

import axios from 'axios';
import { checkAppServer, getAppServerUrl } from '../utils/appServerCheck.js';

// Tool configuration
export const listToolConfig = {
  title: "List K6 Scripts",
  description: "List available K6 test scripts in the project",
  inputSchema: {},
};

/**
 * Handle listing K6 test scripts
 */
export async function handleList() {
  try {
    // Check if App Server is available
    const serverAvailable = await checkAppServer();
    if (!serverAvailable) {
      throw new Error('K6 App Server is not available. Please start it with: cd k6-app-server && npm start');
    }

    const appServerUrl = getAppServerUrl();
    const response = await axios.get(`${appServerUrl}/api/tests/available`);

    const { tests, count, timestamp } = response.data;

    // Transform App Server response to match expected format
    const scripts = tests.map(test => ({
      name: test.name,
      filename: test.filename,
      path: test.path,
      relativePath: test.path, // App Server already provides relative path
      description: test.description,
      // New metadata from App Server
      stages: test.stages,
      totalDuration: test.totalDuration,
      maxVUs: test.maxVUs,
      // Keep some compatibility fields
      size: undefined, // Not provided by App Server
      modified: undefined // Not provided by App Server
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              scripts,
              count,
              timestamp,
              source: 'k6-app-server',
              appServerUrl,
              // Enhanced metadata available
              metadata: {
                stagesAvailable: true,
                durationAvailable: true,
                maxVUsAvailable: true
              }
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "Failed to list K6 scripts",
              message: error.response?.data?.error || error.message,
              hint: error.message.includes('App Server') ?
                'Start the K6 App Server with: cd k6-app-server && npm start' : undefined,
              timestamp: new Date().toISOString()
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

