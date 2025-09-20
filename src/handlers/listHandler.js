/**
 * K6 List Handler
 * Handles listing of available K6 test scripts
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const projectRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
    const testDirs = [
      path.join(projectRoot, "demo-app/tests/k6"),
      path.join(projectRoot, "test-scripts"),
      path.join(projectRoot, "tests/k6"),
      path.join(projectRoot, "k6-tests"),
    ];

    const scripts = [];

    for (const dir of testDirs) {
      try {
        const files = await fs.readdir(dir);
        const jsFiles = files.filter((f) => f.endsWith(".js"));

        for (const file of jsFiles) {
          const fullPath = path.join(dir, file);
          const stats = await fs.stat(fullPath);

          scripts.push({
            name: path.basename(file, ".js"),
            path: fullPath,
            relativePath: path.relative(projectRoot, fullPath),
            description: formatDescription(path.basename(file, ".js")),
            size: stats.size,
            modified: stats.mtime,
          });
        }
      } catch (err) {
        // Directory doesn't exist, skip it silently
      }
    }

    // Sort by name
    scripts.sort((a, b) => a.name.localeCompare(b.name));

    // Add default examples if no scripts found
    if (scripts.length === 0) {
      scripts.push(
        {
          name: "basic-load",
          path: "demo-app/tests/k6/basic-load.js",
          relativePath: "demo-app/tests/k6/basic-load.js",
          description: "Basic load test",
        },
        {
          name: "spike-test",
          path: "demo-app/tests/k6/spike-test.js",
          relativePath: "demo-app/tests/k6/spike-test.js",
          description: "Spike test",
        },
        {
          name: "stress-test",
          path: "demo-app/tests/k6/stress-test.js",
          relativePath: "demo-app/tests/k6/stress-test.js",
          description: "Stress test",
        },
        {
          name: "Checkout Flow Test",
          path: "demo-app/tests/k6/checkout-flow.js",
          relativePath: "demo-app/tests/k6/checkout-flow.js",
          description:
            "Checkout flow test that exercises all available API functionalities in the demo app",
        }
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              scripts,
              count: scripts.length,
              searchDirs: testDirs.map((dir) =>
                path.relative(projectRoot, dir)
              ),
              workingDirectory: process.cwd(),
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
              message: error.message,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

/**
 * Format script name into description
 */
function formatDescription(name) {
  return name
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
