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

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'create_pr') {
      return await createPR(args);
    }

    if (name === 'comment_on_pr') {
      return await commentOnPR(args);
    }

    if (name === 'get_pr') {
      return await getPR(args);
    }

    if (name === 'list_prs') {
      return await listPRs(args);
    }

    if (name === 'merge_pr') {
      return await mergePR(args);
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

// GitHub API: Create pull request
async function createPR({
  owner,
  repo,
  title,
  body = '',
  head,
  base = 'main'
}) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  const pr = await response.json();

  return {
    content: [
      {
        type: 'text',
        text: `✓ Pull request created successfully!\n\n` +
              `Title: ${pr.title}\n` +
              `Number: #${pr.number}\n` +
              `URL: ${pr.html_url}\n` +
              `From: ${pr.head.ref} → ${pr.base.ref}`,
      },
    ],
  };
}

// GitHub API: Comment on pull request
async function commentOnPR({
  owner,
  repo,
  pr_number,
  body
}) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${pr_number}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  const comment = await response.json();

  return {
    content: [
      {
        type: 'text',
        text: `✓ Comment posted successfully!\n\n` +
              `PR: #${pr_number}\n` +
              `Comment URL: ${comment.html_url}`,
      },
    ],
  };
}

// GitHub API: Get pull request details
async function getPR({
  owner,
  repo,
  pr_number
}) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  const pr = await response.json();

  return {
    content: [
      {
        type: 'text',
        text: `Pull Request #${pr.number}\n\n` +
              `Title: ${pr.title}\n` +
              `State: ${pr.state}\n` +
              `Author: ${pr.user.login}\n` +
              `Branch: ${pr.head.ref} → ${pr.base.ref}\n` +
              `Mergeable: ${pr.mergeable ?? 'unknown'}\n` +
              `Merged: ${pr.merged}\n` +
              `URL: ${pr.html_url}\n\n` +
              `${pr.body || '(no description)'}`,
      },
    ],
  };
}

// GitHub API: List pull requests
async function listPRs({
  owner,
  repo,
  state = 'open'
}) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  const prs = await response.json();

  if (prs.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No ${state} pull requests found in ${owner}/${repo}`,
        },
      ],
    };
  }

  const prList = prs.map(pr =>
    `#${pr.number} - ${pr.title} (${pr.user.login}) [${pr.state}]`
  ).join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `Pull Requests in ${owner}/${repo} (${state}):\n\n${prList}`,
      },
    ],
  };
}

// GitHub API: Merge pull request
async function mergePR({
  owner,
  repo,
  pr_number,
  merge_method = 'merge',
  commit_title,
  commit_message
}) {
  const body = {
    merge_method,
  };

  if (commit_title) body.commit_title = commit_title;
  if (commit_message) body.commit_message = commit_message;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/merge`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  const result = await response.json();

  return {
    content: [
      {
        type: 'text',
        text: `✓ Pull request merged successfully!\n\n` +
              `PR: #${pr_number}\n` +
              `Method: ${merge_method}\n` +
              `SHA: ${result.sha}\n` +
              `Message: ${result.message}`,
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
