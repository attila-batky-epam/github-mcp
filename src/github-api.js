/**
 * GitHub API Functions
 * Pure functions for GitHub operations - no MCP protocol code
 */

// API Configuration
const GITHUB_API_CONFIG = {
  PER_PAGE: 30,
  API_VERSION: '2022-11-28',
};

/**
 * Create GitHub API headers with authentication
 */
function getHeaders(token) {
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
async function githubRequest(url, options, token) {
  const response = await fetch(url, {
    ...options,
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  return response.json();
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
}) {
  const pr = await githubRequest(
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
}) {
  const comment = await githubRequest(
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
}) {
  const pr = await githubRequest(
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
}) {
  const prs = await githubRequest(
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
}) {
  const body = { merge_method };
  if (commit_title) body.commit_title = commit_title;
  if (commit_message) body.commit_message = commit_message;

  const result = await githubRequest(
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
