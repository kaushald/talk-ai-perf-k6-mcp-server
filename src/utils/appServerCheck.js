/**
 * App Server Check Utility
 * Checks if the K6 App Server is available
 */

import axios from 'axios';
import chalk from 'chalk';

const APP_SERVER_URL = process.env.K6_APP_SERVER_URL || 'http://localhost:3001';

/**
 * Check if App Server is available
 */
export async function checkAppServer() {
  try {
    const response = await axios.get(`${APP_SERVER_URL}/health`);
    return response.data.status === 'healthy';
  } catch (error) {
    console.error(chalk.yellow('⚠️  K6 App Server not available at'), APP_SERVER_URL);
    return false;
  }
}

/**
 * Get App Server URL
 */
export function getAppServerUrl() {
  return APP_SERVER_URL;
}

/**
 * Get API base URL
 */
export function getApiBaseUrl() {
  return `${APP_SERVER_URL}/api/tests`;
}