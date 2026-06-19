import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as github from './github-api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GitHub API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPR', () => {
    it('should create a PR successfully with all parameters', async () => {
      const mockPR = {
        number: 123,
        title: 'Test PR',
        html_url: 'https://github.com/owner/repo/pull/123',
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPR,
      });

      const result = await github.createPR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        body: 'Test description',
        head: 'feature-branch',
        base: 'main',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Pull request created successfully');
      expect(result.message).toContain('#123');
      expect(result.data).toEqual(mockPR);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Accept': 'application/vnd.github+json',
          }),
        })
      );
    });

    it('should use default base branch when not specified', async () => {
      const mockPR = {
        number: 456,
        title: 'Test PR',
        html_url: 'https://github.com/owner/repo/pull/456',
        head: { ref: 'feature' },
        base: { ref: 'main' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPR,
      });

      await github.createPR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        head: 'feature',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.base).toBe('main');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        json: async () => ({ message: 'Insufficient permissions' }),
      });

      await expect(
        github.createPR({
          token: 'bad-token',
          owner: 'owner',
          repo: 'repo',
          title: 'Test PR',
          head: 'feature',
        })
      ).rejects.toThrow('GitHub API error: Insufficient permissions');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        github.createPR({
          token: 'test-token',
          owner: 'owner',
          repo: 'repo',
          title: 'Test PR',
          head: 'feature',
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('commentOnPR', () => {
    it('should post a comment successfully', async () => {
      const mockComment = {
        html_url: 'https://github.com/owner/repo/pull/123#issuecomment-456',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComment,
      });

      const result = await github.commentOnPR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
        body: 'Test comment',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Comment posted successfully');
      expect(result.message).toContain('#123');
      expect(result.data).toEqual(mockComment);
    });

    it('should handle markdown in comment body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ html_url: 'https://test.com' }),
      });

      await github.commentOnPR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
        body: '## Header\n- List item\n```code```',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.body).toContain('## Header');
      expect(callBody.body).toContain('```code```');
    });

    it('should handle API errors when posting comments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ message: 'PR not found' }),
      });

      await expect(
        github.commentOnPR({
          token: 'test-token',
          owner: 'owner',
          repo: 'repo',
          pr_number: 999,
          body: 'Comment',
        })
      ).rejects.toThrow('GitHub API error: PR not found');
    });
  });

  describe('getPR', () => {
    it('should get PR details successfully', async () => {
      const mockPR = {
        number: 123,
        title: 'Test PR',
        body: 'Description',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature' },
        base: { ref: 'main' },
        mergeable: true,
        merged: false,
        html_url: 'https://github.com/owner/repo/pull/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPR,
      });

      const result = await github.getPR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Pull Request #123');
      expect(result.message).toContain('Test PR');
      expect(result.message).toContain('testuser');
      expect(result.data).toEqual(mockPR);
    });

    it('should handle PR with null body', async () => {
      const mockPR = {
        number: 123,
        title: 'Test PR',
        body: null,
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature' },
        base: { ref: 'main' },
        mergeable: null,
        merged: false,
        html_url: 'https://github.com/owner/repo/pull/123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPR,
      });

      const result = await github.getPR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
      });

      expect(result.message).toContain('(no description)');
      expect(result.message).toContain('unknown');
    });
  });

  describe('listPRs', () => {
    it('should list open PRs by default', async () => {
      const mockPRs = [
        {
          number: 1,
          title: 'PR 1',
          user: { login: 'user1' },
          state: 'open',
        },
        {
          number: 2,
          title: 'PR 2',
          user: { login: 'user2' },
          state: 'open',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs,
      });

      const result = await github.listPRs({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('#1 - PR 1');
      expect(result.message).toContain('#2 - PR 2');
      expect(result.data).toEqual(mockPRs);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=open'),
        expect.any(Object)
      );
    });

    it('should list closed PRs when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await github.listPRs({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        state: 'closed',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=closed'),
        expect.any(Object)
      );
    });

    it('should handle empty PR list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await github.listPRs({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No open pull requests found');
      expect(result.data).toEqual([]);
    });

    it('should include pagination parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await github.listPRs({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=30'),
        expect.any(Object)
      );
    });
  });

  describe('mergePR', () => {
    it('should merge PR with default method', async () => {
      const mockResult = {
        sha: 'abc123',
        message: 'Pull Request successfully merged',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await github.mergePR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Pull request merged successfully');
      expect(result.message).toContain('abc123');
      expect(result.data).toEqual(mockResult);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.merge_method).toBe('merge');
    });

    it('should merge PR with squash method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sha: 'def456', message: 'Merged' }),
      });

      await github.mergePR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
        merge_method: 'squash',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.merge_method).toBe('squash');
    });

    it('should include custom commit title and message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sha: 'ghi789', message: 'Merged' }),
      });

      await github.mergePR({
        token: 'test-token',
        owner: 'owner',
        repo: 'repo',
        pr_number: 123,
        commit_title: 'Custom title',
        commit_message: 'Custom message',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.commit_title).toBe('Custom title');
      expect(callBody.commit_message).toBe('Custom message');
    });

    it('should handle merge conflicts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Conflict',
        json: async () => ({ message: 'Merge conflict' }),
      });

      await expect(
        github.mergePR({
          token: 'test-token',
          owner: 'owner',
          repo: 'repo',
          pr_number: 123,
        })
      ).rejects.toThrow('GitHub API error: Merge conflict');
    });

    it('should handle PR not mergeable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Method Not Allowed',
        json: async () => ({ message: 'Pull Request is not mergeable' }),
      });

      await expect(
        github.mergePR({
          token: 'test-token',
          owner: 'owner',
          repo: 'repo',
          pr_number: 123,
        })
      ).rejects.toThrow('GitHub API error: Pull Request is not mergeable');
    });
  });

  describe('API Headers', () => {
    it('should include correct headers in all requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          number: 1,
          title: 'Test',
          html_url: 'https://test.com',
          head: { ref: 'feature' },
          base: { ref: 'main' },
        }),
      });

      await github.createPR({
        token: 'test-token-123',
        owner: 'owner',
        repo: 'repo',
        title: 'Test',
        head: 'feature',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle API errors without message field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      await expect(
        github.createPR({
          token: 'test-token',
          owner: 'owner',
          repo: 'repo',
          title: 'Test',
          head: 'feature',
        })
      ).rejects.toThrow('GitHub API error: Internal Server Error');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        github.createPR({
          token: 'test-token',
          owner: 'owner',
          repo: 'repo',
          title: 'Test',
          head: 'feature',
        })
      ).rejects.toThrow();
    });
  });
});
