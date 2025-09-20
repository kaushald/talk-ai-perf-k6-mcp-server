# K6 MCP Server

MCP server that enables AI agents to execute and analyze K6 performance tests.

**Updated**: September 3, 2025 - Integrated with K6 App Server for non-blocking operations

## Architecture

### Current Implementation (as of September 3, 2025)
This MCP server now integrates with the K6 App Server for non-blocking test execution:
- **K6 MCP Server** (this): Lightweight protocol handler for Claude Desktop
- **K6 App Server** (implemented): REST API that actually executes tests
- **Benefits**: Non-blocking operations, better resource management, demo-friendly

```
Claude Desktop → K6 MCP Server → K6 App Server → K6 Process
     ↓                ↓                ↓              ↓
   (MCP)           (HTTP)          (REST API)    (Execution)
```

## Installation

```bash
npm install
```

## Configuration for Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "k6-mcp": {
      "command": "/path/to/node",
      "args": ["/absolute/path/to/mcp-servers/k6-mcp-server/src/index.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

**Important for nvm users**: Use the full path to Node.js (find with `which node`):
```json
"command": "/Users/username/.local/share/nvm/vX.X.X/bin/node"
```

## Available Tools

### k6_run
Execute a K6 performance test script.

**Parameters:**
- `script` (required): Path to the K6 test script
- `vus`: Number of virtual users (default: 10)
- `duration`: Test duration (default: "30s")
- `env`: Environment variables for the test

**Example:**
```javascript
{
  "script": "demo-app/tests/k6/basic-load.js",
  "vus": 20,
  "duration": "1m",
  "env": {
    "BASE_URL": "http://localhost:3000"
  }
}
```

### k6_list
List all available K6 test scripts in the project.

**Example:**
```javascript
// No parameters required
{}
```

### k6_analyze
Analyze K6 test results and provide insights.

**Parameters:**
- `testId`: ID of a completed test
- `resultFile`: Path to a K6 result file

**Example:**
```javascript
{
  "testId": "test_1234567890_abc123"
}
```

### k6_generate
Generate K6 test scripts from templates or specifications.

**Parameters:**
- `source` (required): Type of generation ("basic", "api", "har", "openapi")
- `input`: Input file or URL
- `options`: Generation options

**Example:**
```javascript
{
  "source": "api",
  "input": "http://localhost:3000",
  "options": {
    "vus": 50,
    "duration": "5m"
  }
}
```

### k6_status
Get the status of running and recent K6 tests.

**Parameters:**
- `testId` (optional): Specific test ID to check status for

**Example:**
```javascript
// Check all tests
{}

// Check specific test
{
  "testId": "k6_1234567890_abc123"
}
```

### k6_output (NEW)
Get real-time output from a running or completed K6 test.

**Parameters:**
- `testId` (required): Test ID to get output for

**Example:**
```javascript
{
  "testId": "k6_1234567890_abc123"
}
```

## Usage with Claude

Once configured, you can ask Claude to:

- "Run the basic load test with K6"
- "List all available performance tests"
- "Analyze the results of the last test"
- "Generate a new API test for the products endpoint"
- "Check if any tests are currently running"

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run in production mode
npm start
```

## Technical Updates

### September 4, 2025 Updates
1. **Tool Behavior Improvements**: 
   - Tools no longer auto-chain actions
   - Each tool completes its task and waits for explicit user instructions
   - Removed directive language from tool descriptions
2. **Response Format Changes**:
   - Changed from directive to informative responses
   - Removed "next_actions" and "recommended" fields
   - Focus on reporting what was done, not what to do next
3. **Path Resolution Fix**:
   - Fixed test-scripts directory creation issue
   - Now uses absolute paths from project root
   - Consistent path resolution across all tools

### September 3, 2025 Updates
1. **MCP SDK Version**: Updated from `0.8.0` (non-existent) to `1.17.0`
2. **API Migration**: Changed from old `Server/setRequestHandler` to new `McpServer/registerTool` pattern
3. **Dependencies**: Added `zod` for schema validation
4. **Console Output**: Fixed stdout/stderr separation for clean MCP responses

## Requirements

- Node.js 20+
- K6 installed and available in PATH (`brew install k6` on macOS)
- K6 App Server running on port 3001 (see `/k6-app-server`)
- Access to test scripts directory