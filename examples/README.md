# Examples

This directory contains example scripts and test utilities for the GitHub MCP server.

## test-mcp-server.js

A simple test client that demonstrates how to interact with the MCP server using the JSON-RPC protocol.

### Usage

```bash
node examples/test-mcp-server.js
```

This will:
1. Start the MCP server
2. Send an initialization request
3. List available tools
4. Exit

### What it demonstrates

- How to spawn the MCP server as a child process
- How to send JSON-RPC messages over stdio
- How to parse MCP responses
- Basic MCP protocol handshake

This is useful for understanding the MCP protocol and debugging server issues.
