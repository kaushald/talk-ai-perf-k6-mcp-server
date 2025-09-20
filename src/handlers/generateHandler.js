/**
 * K6 Generate Tool Handler
 * Coordinates script generation from various sources
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBasicScript } from '../generators/basicGenerator.js';
import { generateApiScript } from '../generators/apiGenerator.js';
import { generateHarScript } from '../generators/harGenerator.js';
import { generateOpenApiScript } from '../generators/openApiGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main handler for k6_generate tool
 */
export async function handleGenerate(args) {
  const { source, input, options = {} } = args;
  
  try {
    let script = '';
    const timestamp = new Date().toISOString();
    
    // Generate script based on source type
    switch (source) {
      case 'basic':
        script = generateBasicScript({
          baseUrl: input || 'http://localhost:3000',
          vus: options.vus || 10,
          duration: options.duration || '2m',
          thinkTime: options.thinkTime || 1,
          scenarioType: options.scenarios && options.scenarios[0] || 'ramping',
          timestamp
        });
        break;
        
      case 'api':
        script = generateApiScript({
          baseUrl: input || 'http://localhost:3000',
          vus: options.vus || 10,
          duration: options.duration || '1m',
          thinkTime: options.thinkTime || 1,
          timestamp
        });
        break;
        
      case 'har':
        script = await generateHarScript({
          harFile: input,
          vus: options.vus || 10,
          duration: options.duration || '5m',
          timestamp
        });
        break;
        
      case 'openapi':
        script = await generateOpenApiScript({
          specFile: input,
          vus: options.vus || 10,
          duration: options.duration || '5m',
          timestamp
        });
        break;
        
      default:
        throw new Error(`Unknown source type: ${source}`);
    }
    
    // Save the generated script
    const filePath = await saveGeneratedScript(script, source);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'K6 script generated and saved successfully',
            file: {
              path: filePath.absolute,
              name: filePath.name,
              source: source,
              generated_at: timestamp
            },
            configuration: {
              vus: options.vus || 10,
              duration: options.duration || '2m',
              scenarios: options.scenarios || ['default'],
              thinkTime: options.thinkTime || 1
            },
            preview: script.substring(0, 500) + '...'
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to generate K6 script',
            message: error.message,
            source,
            input
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Save generated script to file
 */
async function saveGeneratedScript(script, source) {
  // Use absolute path at project root
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const scriptsDir = path.join(projectRoot, 'test-scripts');
  const fileName = `generated_${source}_${Date.now()}.js`;
  const filePath = path.join(scriptsDir, fileName);
  
  // Ensure directory exists
  await fs.mkdir(scriptsDir, { recursive: true });
  await fs.writeFile(filePath, script);
  
  return {
    absolute: filePath,
    name: fileName,
    dir: scriptsDir
  };
}

/**
 * Tool configuration for registration
 */
export const generateToolConfig = {
  title: 'Generate K6 Script',
  description: 'Generate K6 test scripts from templates or specifications and save to file',
  inputSchema: {
    source: {
      type: 'string',
      enum: ['basic', 'api', 'har', 'openapi'],
      description: 'Source type for generation'
    },
    input: {
      type: 'string',
      description: 'Input file or URL',
      optional: true
    },
    options: {
      type: 'object',
      properties: {
        vus: { type: 'number', optional: true },
        duration: { type: 'string', optional: true },
        scenarios: { 
          type: 'array',
          items: { type: 'string' },
          optional: true 
        },
        thinkTime: { type: 'number', optional: true },
        assertions: { type: 'boolean', optional: true }
      },
      optional: true,
      description: 'Generation options'
    }
  }
};