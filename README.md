# GitHub MCP Server

A simple Model Context Protocol (MCP) server for GitHub operations.

## Features

- Create GitHub repositories
- More features coming: commits, pushes, PR comments

## Setup

1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens?type=beta
   - Create a fine-grained token with:
     - Repository access: All repositories
     - Permissions: Administration (RW), Contents (RW), Pull Requests (RW)

2. Create `.env` file:
   ```bash
   GITHUB_TOKEN=your-token-here
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Test directly:
```bash
npm start
```

### Configure with Claude Code:

Add to `.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["C:/code/github-mcp/src/index.js"],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Available Tools

- `create_repo` - Create a new GitHub repository
  - `name` (required): Repository name
  - `description` (optional): Repository description
  - `private` (optional): Make repository private (default: false)

## Development

This is a learning project to understand MCP server architecture.
