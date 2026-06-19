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

## Future Extensions

This library currently focuses on core PR and merging workflows. Potential future extensions include:

### Core Workflow Operations
- **Branch Management**: `create_branch`, `list_branches`, `delete_branch`, `compare_branches`
- **Issue Management**: `create_issue`, `list_issues`, `update_issue`, `close_issue`, `add_issue_comment`
- **Commit Operations**: `get_commit`, `list_commits` with filtering
- **Repository Content**: `get_file`, `update_file`, `get_directory` for direct file operations

### CI/CD Integration
- **GitHub Actions**: `trigger_workflow`, `get_workflow_runs`, `get_run_logs`
- **Commit Status API**: `create_commit_status`, `get_commit_statuses` for external CI
- **Enhanced PR Details**: `get_pr_files`, `get_pr_commits`, `request_reviewers`

### Advanced Features
- **Release Management**: `create_release`, `list_releases`, `create_tag`
- **Repository Search**: `search_code`, `search_issues`, `search_commits`
- **Security**: `list_security_advisories`, `get_dependabot_alerts`

The automated PR review tool (`review-pr.ts`) serves as a CI/CD quality gate and is intentionally separate from the core MCP library.

## Development Retrospective

This project was built through human-AI collaboration using Claude Code. Key learnings:

### What Required Human Guidance

**1. Git Workflow Discipline**
- **Issue**: AI initially committed directly to `main` branch
- **Fix**: User enforced branch-first workflow, set up branch protection via GitHub API
- **Lesson**: AI needs explicit constraints on destructive/risky operations

**2. Code Quality & Performance**
- **Issue**: Initial test code was verbose (385 lines for github-api tests)
- **Iterations**: 3 self-audit rounds reduced to 227 lines (-41%) while maintaining 100% coverage
- **Approach**: User requested "performance/cleanup audit" prompts
- **Lesson**: AI benefits from explicit optimization passes after generation

**3. Scope Management**
- **Issue**: AI wanted to add lint rules, prettier, complex tooling
- **Fix**: User kept scope minimal ("we don't need that")
- **Lesson**: AI tends toward over-engineering; human judgment keeps it practical

**4. Test Strategy**
- **Issue**: Initial approach tried to test implementation files with actual logic
- **Pivot**: User guided toward testing the extracted pure logic (patterns, analysis)
- **Result**: 100% coverage on `github-api.ts`, meaningful tests on `review-pr.ts`
- **Lesson**: AI can test effectively when given clear architectural direction

**5. CI Pipeline Architecture**
- **Issue**: Initial single test job combined unit tests + coverage
- **Improvement**: User requested split into fast unit test job + coverage job
- **Result**: 13s fast feedback vs 16s+ combined, parallel execution
- **Lesson**: AI implements well but human insight drives architectural improvements

### What Worked Without Changes

**1. TypeScript Migration**
- AI correctly converted JS → TS with proper types
- Type definitions for GitHub API were accurate
- No type errors after initial conversion

**2. Test Infrastructure Setup**
- Vitest configuration with coverage was correct first try
- Test patterns (mocking, helpers, DRY principles) were sound
- Coverage thresholds appropriately set

**3. GitHub API Integration**
- API request patterns were correct
- Error handling was appropriate
- Token authentication worked as expected

**4. Documentation**
- README updates were comprehensive
- Code examples were accurate
- Installation instructions were clear

### Collaboration Pattern

**Effective workflow:**
1. User provides high-level requirement ("add unit testing")
2. AI implements full solution
3. User requests optimization ("cleanup audit round")
4. AI refactors with metrics (LoC reduction, coverage maintained)
5. User approves or redirects

**Key principle**: AI is thorough but needs human judgment on:
- When to stop adding features
- When "good enough" beats "perfect"
- What trade-offs to make (verbosity vs DRY, speed vs completeness)

### Metrics

- **Project Duration**: ~3 days of iterative development
- **Test Coverage**: 100% on core API, 100% on review logic
- **Code Quality**: 227 lines of tests (from 385), optimized CI pipeline
- **Git Discipline**: 14 PRs, 0 direct main commits after enforcement
- **CI Performance**: 20% pipeline speedup with parallel jobs
