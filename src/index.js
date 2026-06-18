#!/usr/bin/env node

/**
 * GitHub MCP Server
 * MCP adapter layer for GitHub operations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import * as github from './github-api.js';

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
        name: 'create_pr',
        description: 'Create a pull request',
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
            title: {
              type: 'string',
              description: 'Pull request title',
            },
            body: {
              type: 'string',
              description: 'Pull request description',
            },
            head: {
              type: 'string',
              description: 'Branch containing changes',
            },
            base: {
              type: 'string',
              description: 'Branch to merge into',
              default: 'main',
            },
          },
          required: ['owner', 'repo', 'title', 'head'],
        },
      },
      {
        name: 'comment_on_pr',
        description: 'Add a comment to a pull request',
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
            pr_number: {
              type: 'number',
              description: 'Pull request number',
            },
            body: {
              type: 'string',
              description: 'Comment text (supports Markdown)',
            },
          },
          required: ['owner', 'repo', 'pr_number', 'body'],
        },
      },
      {
        name: 'get_pr',
        description: 'Get details about a pull request',
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
            pr_number: {
              type: 'number',
              description: 'Pull request number',
            },
          },
          required: ['owner', 'repo', 'pr_number'],
        },
      },
      {
        name: 'list_prs',
        description: 'List pull requests for a repository',
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
            state: {
              type: 'string',
              description: 'Filter by state: open, closed, or all',
              enum: ['open', 'closed', 'all'],
              default: 'open',
            },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'merge_pr',
        description: 'Merge a pull request',
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
            pr_number: {
              type: 'number',
              description: 'Pull request number',
            },
            merge_method: {
              type: 'string',
              description: 'Merge method to use',
              enum: ['merge', 'squash', 'rebase'],
              default: 'merge',
            },
            commit_title: {
              type: 'string',
              description: 'Title for the merge commit (optional)',
            },
            commit_message: {
              type: 'string',
              description: 'Message for the merge commit (optional)',
            },
          },
          required: ['owner', 'repo', 'pr_number'],
        },
      },
    ],
  };
});

// Handle tool calls - thin adapter to github-api.js
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    if (name === 'create_pr') {
      result = await github.createPR({ token: GITHUB_TOKEN, ...args });
    } else if (name === 'comment_on_pr') {
      result = await github.commentOnPR({ token: GITHUB_TOKEN, ...args });
    } else if (name === 'get_pr') {
      result = await github.getPR({ token: GITHUB_TOKEN, ...args });
    } else if (name === 'list_prs') {
      result = await github.listPRs({ token: GITHUB_TOKEN, ...args });
    } else if (name === 'merge_pr') {
      result = await github.mergePR({ token: GITHUB_TOKEN, ...args });
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
      };
    }

    // Convert github-api result to MCP format
    return {
      content: [
        {
          type: 'text',
          text: result.message,
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
