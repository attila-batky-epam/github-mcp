# GitHub MCP Server

A simple Model Context Protocol (MCP) server for GitHub operations.

## Features

- Create and manage pull requests
- Comment on PRs
- List and get PR details
- Merge pull requests

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

4. Build the TypeScript project:
   ```bash
   npm run build
   ```

## Usage

### Development mode (with TypeScript directly):
```bash
npm run dev
```

### Production mode (compiled JavaScript):
```bash
npm start
```

For testing and examples, see the [examples/](examples/) directory.

### Configure with Claude Code:

Add to `.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["C:/code/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Available Tools

- `create_pr` - Create a pull request
  - `owner` (required): Repository owner (username or org)
  - `repo` (required): Repository name
  - `title` (required): Pull request title
  - `body` (optional): Pull request description
  - `head` (required): Branch containing changes
  - `base` (optional): Branch to merge into (default: "main")

- `comment_on_pr` - Add a comment to a pull request
  - `owner` (required): Repository owner (username or org)
  - `repo` (required): Repository name
  - `pr_number` (required): Pull request number
  - `body` (required): Comment text (supports Markdown)

- `get_pr` - Get details about a pull request
  - `owner` (required): Repository owner (username or org)
  - `repo` (required): Repository name
  - `pr_number` (required): Pull request number

- `list_prs` - List pull requests for a repository
  - `owner` (required): Repository owner (username or org)
  - `repo` (required): Repository name
  - `state` (optional): Filter by state - "open", "closed", or "all" (default: "open")

- `merge_pr` - Merge a pull request
  - `owner` (required): Repository owner (username or org)
  - `repo` (required): Repository name
  - `pr_number` (required): Pull request number
  - `merge_method` (optional): "merge", "squash", or "rebase" (default: "merge")
  - `commit_title` (optional): Custom merge commit title
  - `commit_message` (optional): Custom merge commit message

## Development

This is a learning project to understand MCP server architecture.
