#!/usr/bin/env node

/**
 * Test script for GitHub MCP server
 * Sends a create_repo request and prints the response
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Start the MCP server
const server = spawn('node', [join(__dirname, 'src', 'index.js')], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

let response = '';

server.stdout.on('data', (data) => {
  response += data.toString();
  // MCP uses JSON-RPC with newline-delimited messages
  if (response.includes('\n')) {
    console.log('Response:', response);
  }
});

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0',
    },
  },
};

console.log('Sending initialize...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait a bit, then list tools
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  };

  console.log('Sending tools/list...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Exit after a moment
  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 2000);
}, 1000);
