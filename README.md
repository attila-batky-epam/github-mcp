# GitHub MCP Server

A Model Context Protocol (MCP) server for GitHub operations, written in TypeScript.

## Features

- Create and manage pull requests
- Comment on PRs
- List and get PR details
- Merge pull requests
- Automated PR review with security and quality checks

## Installation & Setup

### For End Users (via npm)

```bash
# Install globally
npm install -g github-mcp

# Or install locally in your project
npm install github-mcp
```

The package comes **pre-built** with compiled JavaScript - no TypeScript setup needed!

### For Contributors (from source)

If you're developing or contributing to this project:

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

### As an npm package (recommended for end users):

After installing via npm, configure in your MCP client:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "github-mcp"],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      }
    }
  }
}
```

### From source (for contributors):

**Development mode** (TypeScript with hot reload):
```bash
npm run dev
```

**Production mode** (compiled JavaScript):
```bash
npm run build
npm start
```

### Configure with Claude Code (local development):

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

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build TypeScript: `npm run build`
4. Run in dev mode: `npm run dev`

### Testing

This project uses Vitest for unit testing:

- **58 test cases** covering happy paths, error handling, and edge cases
- **100% coverage** on core API functions
- **Security pattern detection** tests for SQL injection, XSS, command injection
- **Fast execution** with Vitest's modern test runner

Run tests:
```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
npm run test:ui           # Interactive test UI
```

### CI/CD

This project uses GitHub Actions for continuous integration:
- **Automated testing** with coverage reports on all PRs
- **Automated builds** on all PRs and pushes to main
- **Type checking** to catch TypeScript errors
- **Multi-version testing** (Node 18.x, 20.x, 22.x)
- **Automated PR reviews** with security and quality checks

The CI workflows are for repo contributors only - end users receive pre-built packages.

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run with tsx (no build needed)
- `npm run clean` - Remove build and coverage artifacts
- `npm start` - Run compiled JavaScript
- `npm run review-pr` - Run PR review tool
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with interactive UI

## Package Distribution

When published to npm:
- ✅ Pre-built JavaScript included (`dist/` directory)
- ✅ TypeScript definitions included (`.d.ts` files)
- ❌ Source TypeScript excluded
- ❌ CI workflows excluded
- ❌ Development files excluded

End users get a ready-to-use package with no build step required!
