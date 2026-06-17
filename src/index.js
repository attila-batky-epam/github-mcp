#!/usr/bin/env node

/**
 * GitHub MCP Server
 * Simple MCP server for GitHub operations: create repos, commit, push, PR comments
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN not found in environment');
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: 'github-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_repo',
        description: 'Create a new GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Repository name',
            },
            description: {
              type: 'string',
              description: 'Repository description',
            },
            private: {
              type: 'boolean',
              description: 'Make repository private',
              default: false,
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'protect_branch',
        description: 'Enable branch protection rules to require pull requests',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or org)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            branch: {
              type: 'string',
              description: 'Branch name to protect',
              default: 'main',
            },
            require_reviews: {
              type: 'boolean',
              description: 'Require pull request reviews before merging',
              default: true,
            },
            required_approving_review_count: {
              type: 'number',
              description: 'Number of approving reviews required (0 = no approval needed, just a PR)',
              default: 0,
            },
          },
          required: ['owner', 'repo'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'create_repo') {
      return await createRepo(args);
    }

    if (name === 'protect_branch') {
      return await protectBranch(args);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// GitHub API: Create repository
async function createRepo({ name, description = '', private: isPrivate = false }) {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  const repo = await response.json();

  return {
    content: [
      {
        type: 'text',
        text: `✓ Repository created successfully!\n\nName: ${repo.name}\nURL: ${repo.html_url}\nClone: ${repo.clone_url}`,
      },
    ],
  };
}

// GitHub API: Protect branch
async function protectBranch({
  owner,
  repo,
  branch = 'main',
  require_reviews = true,
  required_approving_review_count = 0
}) {
  const protection = {
    required_pull_request_reviews: require_reviews ? {
      required_approving_review_count,
      dismiss_stale_reviews: false,
      require_code_owner_reviews: false,
    } : null,
    enforce_admins: false,
    restrictions: null,
    required_status_checks: null,
    allow_force_pushes: false,
    allow_deletions: false,
  };

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(protection),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: `✓ Branch protection enabled for ${branch}!\n\n` +
              `Repository: ${owner}/${repo}\n` +
              `Branch: ${branch}\n` +
              `Require PRs: ${require_reviews}\n` +
              `Required approvals: ${required_approving_review_count}`,
      },
    ],
  };
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitHub MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
