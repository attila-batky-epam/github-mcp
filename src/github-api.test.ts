import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as github from './github-api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GitHub API', () => {
  beforeEach(() => mockFetch.mockClear());

  const mockResponse = (data: unknown) => ({
    ok: true,
    json: async () => data,
  });

  const mockError = (message: string) => ({
    ok: false,
    statusText: 'Error',
    json: async () => ({ message }),
  });

  describe('createPR', () => {
    const mockPR = {
      number: 123,
      title: 'Test PR',
      html_url: 'https://github.com/owner/repo/pull/123',
      head: { ref: 'feature' },
      base: { ref: 'main' },
    };

    it('should create PR successfully', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mockPR));

      const result = await github.createPR({
        token: 'token',
        owner: 'owner',
        repo: 'repo',
        title: 'Test',
        head: 'feature',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('#123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pulls'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should use default base branch', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mockPR));
      await github.createPR({ token: 'token', owner: 'owner', repo: 'repo', title: 'Test', head: 'feature' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.base).toBe('main');
    });

    it('should handle errors', async () => {
      mockFetch.mockResolvedValueOnce(mockError('Forbidden'));
      await expect(github.createPR({ token: 'bad', owner: 'owner', repo: 'repo', title: 'Test', head: 'feature' }))
        .rejects.toThrow('GitHub API error: Forbidden');
    });
  });

  describe('commentOnPR', () => {
    it('should post comment successfully', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ html_url: 'https://test.com' }));

      const result = await github.commentOnPR({
        token: 'token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
        body: 'Comment',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('#123');
    });

    it('should handle markdown content', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ html_url: 'https://test.com' }));
      await github.commentOnPR({ token: 'token', owner: 'owner', repo: 'repo', pr_number: 123, body: '## Header\n```code```' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.body).toContain('## Header');
    });

    it('should handle errors', async () => {
      mockFetch.mockResolvedValueOnce(mockError('Not Found'));
      await expect(github.commentOnPR({ token: 'token', owner: 'owner', repo: 'repo', pr_number: 999, body: 'Test' }))
        .rejects.toThrow('Not Found');
    });
  });

  describe('getPR', () => {
    const mockPR = {
      number: 123,
      title: 'Test',
      body: 'Desc',
      state: 'open',
      user: { login: 'user' },
      head: { ref: 'feature' },
      base: { ref: 'main' },
      mergeable: true,
      merged: false,
      html_url: 'https://test.com',
    };

    it('should get PR details', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(mockPR));

      const result = await github.getPR({ token: 'token', owner: 'owner', repo: 'repo', pr_number: 123 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('#123');
      expect(result.message).toContain('user');
    });

    it('should handle null body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ ...mockPR, body: null, mergeable: null }));

      const result = await github.getPR({ token: 'token', owner: 'owner', repo: 'repo', pr_number: 123 });

      expect(result.message).toContain('(no description)');
      expect(result.message).toContain('unknown');
    });
  });

  describe('listPRs', () => {
    it('should list PRs', async () => {
      const prs = [
        { number: 1, title: 'PR1', user: { login: 'user1' }, state: 'open' },
        { number: 2, title: 'PR2', user: { login: 'user2' }, state: 'open' },
      ];
      mockFetch.mockResolvedValueOnce(mockResponse(prs));

      const result = await github.listPRs({ token: 'token', owner: 'owner', repo: 'repo' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('#1');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('state=open'), expect.any(Object));
    });

    it('should handle empty list', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]));

      const result = await github.listPRs({ token: 'token', owner: 'owner', repo: 'repo', state: 'closed' });

      expect(result.message).toContain('No closed pull requests');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('state=closed'), expect.any(Object));
    });
  });

  describe('mergePR', () => {
    it('should merge PR with defaults', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ sha: 'abc123', message: 'Merged' }));

      const result = await github.mergePR({ token: 'token', owner: 'owner', repo: 'repo', pr_number: 123 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('abc123');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.merge_method).toBe('merge');
    });

    it('should merge with squash method', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ sha: 'def', message: 'Merged' }));

      await github.mergePR({ token: 'token', owner: 'owner', repo: 'repo', pr_number: 123, merge_method: 'squash' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.merge_method).toBe('squash');
    });

    it('should include custom commit message', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ sha: 'ghi', message: 'Merged' }));

      await github.mergePR({
        token: 'token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
        commit_title: 'Title',
        commit_message: 'Message'
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.commit_title).toBe('Title');
      expect(body.commit_message).toBe('Message');
    });

    it('should handle conflicts', async () => {
      mockFetch.mockResolvedValueOnce(mockError('Merge conflict'));
      await expect(github.mergePR({ token: 'token', owner: 'owner', repo: 'repo', pr_number: 123 }))
        .rejects.toThrow('Merge conflict');
    });
  });

  describe('Error handling', () => {
    it('should include auth headers', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ number: 1, title: 'Test', html_url: 'https://test.com', head: { ref: 'f' }, base: { ref: 'm' } }));
      await github.createPR({ token: 'token-123', owner: 'owner', repo: 'repo', title: 'Test', head: 'feature' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token-123',
            'X-GitHub-Api-Version': '2022-11-28',
          }),
        })
      );
    });

    it('should handle missing error message', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Error', json: async () => ({}) });
      await expect(github.createPR({ token: 'token', owner: 'owner', repo: 'repo', title: 'Test', head: 'feature' }))
        .rejects.toThrow('GitHub API error: Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(github.createPR({ token: 'token', owner: 'owner', repo: 'repo', title: 'Test', head: 'feature' }))
        .rejects.toThrow('Network error');
    });
  });
});
