/**
 * K6 MCP Server - Fully Refactored Version
 * Model Context Protocol server for K6 performance testing
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import chalk from 'chalk';

// Import all handlers
import { handleGenerate, generateToolConfig } from './handlers/generateHandler.js';
import { handleRun, runToolConfig } from './handlers/runHandler.js';
import { handleList, listToolConfig } from './handlers/listHandler.js';
import { handleAnalyze, analyzeToolConfig } from './handlers/analyzeHandler.js';
import { handleStatus, statusToolConfig } from './handlers/statusHandler.js';
import { handleOutput, outputToolConfig } from './handlers/outputHandler.js';

// Import utilities
import { checkAppServer, getAppServerUrl } from './utils/appServerCheck.js';

// Create the MCP server
const server = new McpServer({
  name: 'k6-mcp-server',
  version: '2.1.0', // Updated version for fully refactored code
});

// Register k6_generate tool
server.registerTool(
  'k6_generate',
  {
    title: generateToolConfig.title,
    description: generateToolConfig.description,
    inputSchema: {
      source: z.enum(['basic', 'api', 'har', 'openapi']).describe(generateToolConfig.inputSchema.source.description),
      input: z.string().optional().describe(generateToolConfig.inputSchema.input.description),
      options: z.object({
        vus: z.number().optional(),
        duration: z.string().optional(),
        scenarios: z.array(z.string()).optional(),
        thinkTime: z.number().optional(),
        assertions: z.boolean().optional()
      }).optional().describe(generateToolConfig.inputSchema.options.description)
    }
  },
  handleGenerate
);

// Register k6_run tool
server.registerTool(
  'k6_run',
  {
    title: runToolConfig.title,
    description: runToolConfig.description,
    inputSchema: {
      script: z.string().describe(runToolConfig.inputSchema.script.description),
      vus: z.number().optional().describe(runToolConfig.inputSchema.vus.description),
      duration: z.string().optional().describe(runToolConfig.inputSchema.duration.description),
      env: z.record(z.string()).optional().describe(runToolConfig.inputSchema.env.description)
    }
  },
  handleRun
);

// Register k6_list tool
server.registerTool(
  'k6_list',
  {
    title: listToolConfig.title,
    description: listToolConfig.description,
    inputSchema: {}
  },
  handleList
);

// Register k6_analyze tool
server.registerTool(
  'k6_analyze',
  {
    title: analyzeToolConfig.title,
    description: analyzeToolConfig.description,
    inputSchema: {
      testId: z.string().optional().describe(analyzeToolConfig.inputSchema.testId.description),
      resultFile: z.string().optional().describe(analyzeToolConfig.inputSchema.resultFile.description)
    }
  },
  handleAnalyze
);

// Register k6_status tool
server.registerTool(
  'k6_status',
  {
    title: statusToolConfig.title,
    description: statusToolConfig.description,
    inputSchema: {
      testId: z.string().optional().describe(statusToolConfig.inputSchema.testId?.description || 'Test ID to check status for')
    }
  },
  handleStatus
);

// Register k6_output tool
server.registerTool(
  'k6_output',
  {
    title: outputToolConfig.title,
    description: outputToolConfig.description,
    inputSchema: {
      testId: z.string().describe(outputToolConfig.inputSchema.testId.description),
      tail: z.number().optional().describe(outputToolConfig.inputSchema.tail?.description || 'Number of lines to show from the end'),
      follow: z.boolean().optional().describe(outputToolConfig.inputSchema.follow?.description || 'Follow output in real-time')
    }
  },
  handleOutput
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error(chalk.green('🚀 K6 MCP Server (Fully Refactored v2.1.0) started successfully'));
  console.error(chalk.blue('📚 Available tools:'));
  console.error('  • k6_generate - Generate test scripts from templates or specifications');
  console.error('  • k6_run      - Execute K6 performance tests');
  console.error('  • k6_list     - List available test scripts');
  console.error('  • k6_analyze  - Analyze test results and provide insights');
  console.error('  • k6_status   - Check status of running and recent tests');
  console.error('  • k6_output   - Get output from running or completed tests');
  console.error('');
  console.error(chalk.yellow('⚠️  Note: This MCP server requires the K6 App Server to be running'));
  console.error(chalk.gray('   Start it with: cd k6-app-server && npm start'));
  console.error('');
  
  // Check App Server availability
  const serverAvailable = await checkAppServer();
  const appServerUrl = getAppServerUrl();
  
  if (serverAvailable) {
    console.error(chalk.green(`✅ K6 App Server is available at ${appServerUrl}`));
  } else {
    console.error(chalk.red(`❌ K6 App Server is NOT available at ${appServerUrl}`));
    console.error(chalk.yellow('   Please start it for full functionality'));
  }
  
  console.error('');
  console.error(chalk.gray('─'.repeat(60)));
  console.error(chalk.gray('Ready to handle K6 performance testing requests...'));
}

main().catch((error) => {
  console.error(chalk.red('Failed to start K6 MCP server:'), error);
  process.exit(1);
});