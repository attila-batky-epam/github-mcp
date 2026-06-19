/**
 * GitHub API Functions
 * Pure functions for GitHub operations - no MCP protocol code
 */

// API Configuration
const GITHUB_API_CONFIG = {
  PER_PAGE: 30,
  API_VERSION: '2022-11-28',
} as const;

// Type Definitions
type GitHubHeaders = Record<string, string>;

interface GitHubUser {
  login: string;
  [key: string]: unknown;
}

interface GitHubRef {
  ref: string;
  [key: string]: unknown;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: GitHubUser;
  head: GitHubRef;
  base: GitHubRef;
  mergeable: boolean | null;
  merged: boolean;
  [key: string]: unknown;
}

interface GitHubComment {
  html_url: string;
  [key: string]: unknown;
}

interface GitHubMergeResult {
  sha: string;
  message: string;
  [key: string]: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CreatePRParams {
  token: string;
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base?: string;
}

interface CommentOnPRParams {
  token: string;
  owner: string;
  repo: string;
  pr_number: number;
  body: string;
}

interface GetPRParams {
  token: string;
  owner: string;
  repo: string;
  pr_number: number;
}

interface ListPRsParams {
  token: string;
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
}

interface MergePRParams {
  token: string;
  owner: string;
  repo: string;
  pr_number: number;
  merge_method?: 'merge' | 'squash' | 'rebase';
  commit_title?: string;
  commit_message?: string;
}

/**
 * Create GitHub API headers with authentication
 */
function getHeaders(token: string): GitHubHeaders {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': GITHUB_API_CONFIG.API_VERSION,
  };
}

/**
 * Make a request to GitHub API with unified error handling
 */
async function githubRequest<T>(url: string, options: RequestInit, token: string): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Create a pull request
 */
export async function createPR({
  token,
  owner,
  repo,
  title,
  body = '',
  head,
  base = 'main'
}: CreatePRParams): Promise<ApiResponse<GitHubPullRequest>> {
  const pr = await githubRequest<GitHubPullRequest>(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: 'POST',
      body: JSON.stringify({ title, body, head, base }),
    },
    token
  );

  return {
    success: true,
    message: `✓ Pull request created successfully!\n\n` +
             `Title: ${pr.title}\n` +
             `Number: #${pr.number}\n` +
             `URL: ${pr.html_url}\n` +
             `From: ${pr.head.ref} → ${pr.base.ref}`,
    data: pr
  };
}

/**
 * Add a comment to a pull request
 */
export async function commentOnPR({
  token,
  owner,
  repo,
  pr_number,
  body
}: CommentOnPRParams): Promise<ApiResponse<GitHubComment>> {
  const comment = await githubRequest<GitHubComment>(
    `https://api.github.com/repos/${owner}/${repo}/issues/${pr_number}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ body }),
    },
    token
  );

  return {
    success: true,
    message: `✓ Comment posted successfully!\n\n` +
             `PR: #${pr_number}\n` +
             `Comment URL: ${comment.html_url}`,
    data: comment
  };
}

/**
 * Get pull request details
 */
export async function getPR({
  token,
  owner,
  repo,
  pr_number
}: GetPRParams): Promise<ApiResponse<GitHubPullRequest>> {
  const pr = await githubRequest<GitHubPullRequest>(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}`,
    { method: 'GET' },
    token
  );

  return {
    success: true,
    message: `Pull Request #${pr.number}\n\n` +
             `Title: ${pr.title}\n` +
             `State: ${pr.state}\n` +
             `Author: ${pr.user.login}\n` +
             `Branch: ${pr.head.ref} → ${pr.base.ref}\n` +
             `Mergeable: ${pr.mergeable ?? 'unknown'}\n` +
             `Merged: ${pr.merged}\n` +
             `URL: ${pr.html_url}\n\n` +
             `${pr.body || '(no description)'}`,
    data: pr
  };
}

/**
 * List pull requests for a repository
 */
export async function listPRs({
  token,
  owner,
  repo,
  state = 'open'
}: ListPRsParams): Promise<ApiResponse<GitHubPullRequest[]>> {
  const prs = await githubRequest<GitHubPullRequest[]>(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=${GITHUB_API_CONFIG.PER_PAGE}`,
    { method: 'GET' },
    token
  );

  if (prs.length === 0) {
    return {
      success: true,
      message: `No ${state} pull requests found in ${owner}/${repo}`,
      data: []
    };
  }

  const prList = prs.map(pr =>
    `#${pr.number} - ${pr.title} (${pr.user.login}) [${pr.state}]`
  ).join('\n');

  return {
    success: true,
    message: `Pull Requests in ${owner}/${repo} (${state}):\n\n${prList}`,
    data: prs
  };
}

/**
 * Merge a pull request
 */
export async function mergePR({
  token,
  owner,
  repo,
  pr_number,
  merge_method = 'merge',
  commit_title,
  commit_message
}: MergePRParams): Promise<ApiResponse<GitHubMergeResult>> {
  const body: Record<string, string> = { merge_method };
  if (commit_title) body.commit_title = commit_title;
  if (commit_message) body.commit_message = commit_message;

  const result = await githubRequest<GitHubMergeResult>(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/merge`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
    token
  );

  return {
    success: true,
    message: `✓ Pull request merged successfully!\n\n` +
             `PR: #${pr_number}\n` +
             `Method: ${merge_method}\n` +
             `SHA: ${result.sha}\n` +
             `Message: ${result.message}`,
    data: result
  };
}
