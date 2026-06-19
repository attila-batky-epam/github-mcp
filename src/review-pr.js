#!/usr/bin/env node

/**
 * Standalone PR Review Script
 * Reads diff from stdin, generates review, posts comment via GitHub API
 * Used by GitHub Actions - no MCP protocol overhead
 */

import { commentOnPR } from './github-api.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = parseInt(process.env.PR_NUMBER);
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

// Analysis thresholds
const THRESHOLDS = {
  MAGIC_NUMBER_DIGITS: 3,
  DEEP_NESTING_LEVEL: 6,
  LARGE_CHANGE_LINES: 200,
  MANY_FILES_COUNT: 10,
  PAGINATION_SIZE: 30,
  LOW_TEST_COVERAGE_RATIO: 0.5,
  MAX_GROUPED_ISSUES: 3,
};

// Pre-compiled regex patterns for performance
const PATTERNS = {
  // File patterns
  DIFF_FILE: /b\/(.*?)$/,
  TEST_FILE: /\.(test|spec)\.|test\.js$/,
  IMPLEMENTATION_FILE: /\.(js|ts|jsx|tsx|py|java|go|rb)$/,
  DOC_FILE: /README|\.md/,

  // Security patterns
  SECRET: /(password|secret|api[_-]?key|token|private[_-]?key)\s*[=:]\s*["'][^"']{8,}/i,
  SQL_INJECTION: /execute\s*\(.*\+|query\s*\(.*\+|\$\{.*\}.*SELECT|eval\s*\(/i,
  COMMAND_INJECTION: /exec\s*\(|system\s*\(|shell_exec|child_process\.exec.*\+/,
  XSS: /innerHTML|dangerouslySetInnerHTML|document\.write/,

  // Breaking changes
  EXPORT_STATEMENT: /export\s+(function|class|const|let|var|default)/,
  FUNCTION_SIGNATURE: /function\s+\w+\s*\([^)]*\)|const\s+\w+\s*=\s*\([^)]*\)\s*=>/,

  // Maintainability patterns
  TODO_COMMENT: /\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK/i,
  MAGIC_NUMBER: /\b\d{3,}\b/,
  CONTROL_FLOW: /^(if|for|while|switch)\s*\(/,
  CONSOLE_LOG: /console\.(log|debug|warn)/,
  COMMENT_OR_DOC: /^\s*\/\/|^\s*\*/,

  // Architecture patterns
  UI_COMPONENT_FILE: /component|view|page/i,
  API_CALL: /fetch\s*\(|axios\.|query\(/,
  CLASS_DECLARATION: /class\s+\w+/,
};

if (!GITHUB_TOKEN || !PR_NUMBER || !REPO_OWNER || !REPO_NAME) {
  console.error('Error: Missing required environment variables');
  console.error('Required: GITHUB_TOKEN, PR_NUMBER, REPO_OWNER, REPO_NAME');
  process.exit(1);
}

// Read diff from stdin
let diffContent = '';
process.stdin.on('data', (chunk) => {
  diffContent += chunk.toString();
});

process.stdin.on('end', async () => {
  try {
    // Analyze the diff
    const stats = analyzeDiff(diffContent);

    // Generate review comment
    const reviewComment = generateReview(stats, diffContent);

    // Post comment via GitHub API
    const result = await commentOnPR({
      token: GITHUB_TOKEN,
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pr_number: PR_NUMBER,
      body: reviewComment
    });

    console.log('✓ Review posted successfully!');
    console.log(result.message);
    process.exit(0);
  } catch (error) {
    console.error('Error posting review:', error.message);
    process.exit(1);
  }
});

/**
 * Analyze diff and extract statistics with security and quality checks
 */
function analyzeDiff(diff) {
  const lines = diff.split('\n');
  const stats = {
    filesChanged: new Set(),
    additions: 0,
    deletions: 0,
    hasTests: false,
    hasDocChanges: false,
    breakingChanges: [],
    securityRisks: [],
    maintainabilityIssues: [],
    separationConcerns: [],
    testCoverage: { modified: 0, tested: 0 },
    refactorSuggestions: []
  };

  let currentFile = '';
  const modifiedFiles = new Set();
  const testFiles = new Set();

  for (const line of lines) {
    // Track current file
    if (line.startsWith('diff --git')) {
      const match = PATTERNS.DIFF_FILE.exec(line);
      if (match) {
        currentFile = match[1];
        stats.filesChanged.add(currentFile);

        // Track test vs implementation files
        if (PATTERNS.TEST_FILE.test(currentFile)) {
          testFiles.add(currentFile);
          stats.hasTests = true;
        } else if (PATTERNS.IMPLEMENTATION_FILE.test(currentFile)) {
          modifiedFiles.add(currentFile);
        }
      }
    }

    // Count additions/deletions
    if (line.startsWith('+') && !line.startsWith('+++')) stats.additions++;
    if (line.startsWith('-') && !line.startsWith('---')) stats.deletions++;

    // Doc changes
    if (PATTERNS.DOC_FILE.test(line)) {
      stats.hasDocChanges = true;
    }

    // SECURITY CHECKS
    // Hardcoded secrets/credentials
    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (PATTERNS.SECRET.test(line)) {
        stats.securityRisks.push({
          type: 'Hardcoded Secret',
          file: currentFile,
          severity: 'HIGH',
          detail: 'Possible hardcoded credential detected'
        });
      }

      // SQL injection risks
      if (PATTERNS.SQL_INJECTION.test(line)) {
        stats.securityRisks.push({
          type: 'SQL Injection Risk',
          file: currentFile,
          severity: 'HIGH',
          detail: 'String concatenation in SQL query detected'
        });
      }

      // Command injection
      if (PATTERNS.COMMAND_INJECTION.test(line)) {
        stats.securityRisks.push({
          type: 'Command Injection Risk',
          file: currentFile,
          severity: 'HIGH',
          detail: 'Potential command injection vulnerability'
        });
      }

      // XSS risks
      if (PATTERNS.XSS.test(line)) {
        stats.securityRisks.push({
          type: 'XSS Risk',
          file: currentFile,
          severity: 'MEDIUM',
          detail: 'Unsafe HTML injection detected'
        });
      }
    }

    // BREAKING CHANGES
    if (line.startsWith('-') && !line.startsWith('---')) {
      // Removed public API/exports
      if (PATTERNS.EXPORT_STATEMENT.test(line)) {
        stats.breakingChanges.push({
          file: currentFile,
          detail: 'Removed or modified exported function/class'
        });
      }

      // Changed function signatures
      if (PATTERNS.FUNCTION_SIGNATURE.test(line)) {
        const nextLines = lines.slice(lines.indexOf(line), lines.indexOf(line) + 3);
        if (nextLines.some(l => l.startsWith('+') && l.match(/function|=>/))) {
          stats.breakingChanges.push({
            file: currentFile,
            detail: 'Function signature changed - may break callers'
          });
        }
      }
    }

    // MAINTAINABILITY ISSUES
    if (line.startsWith('+') && !line.startsWith('+++')) {
      // Long functions (heuristic: many lines added in sequence)
      const trimmed = line.substring(1).trim();

      // TODO comments
      if (PATTERNS.TODO_COMMENT.test(line)) {
        stats.maintainabilityIssues.push({
          type: 'TODO/FIXME',
          file: currentFile,
          detail: 'Code marked for future work'
        });
      }

      // Magic numbers
      if (PATTERNS.MAGIC_NUMBER.test(trimmed) && !PATTERNS.COMMENT_OR_DOC.test(trimmed)) {
        stats.maintainabilityIssues.push({
          type: 'Magic Number',
          file: currentFile,
          detail: 'Consider extracting to named constant'
        });
      }

      // Deeply nested code (more than 3 levels)
      const indentLevel = (line.match(/^\+(\s+)/)?.[1]?.length || 0) / 2;
      if (indentLevel > THRESHOLDS.DEEP_NESTING_LEVEL && PATTERNS.CONTROL_FLOW.test(trimmed)) {
        stats.maintainabilityIssues.push({
          type: 'Deep Nesting',
          file: currentFile,
          detail: 'Consider extracting nested logic to separate functions'
        });
      }

      // Console.log in production code
      if (PATTERNS.CONSOLE_LOG.test(trimmed) && !currentFile.includes('test')) {
        stats.maintainabilityIssues.push({
          type: 'Debug Code',
          file: currentFile,
          detail: 'Console.log statements should use proper logging'
        });
      }
    }

    // SEPARATION OF CONCERNS
    if (line.startsWith('+') && !line.startsWith('+++')) {
      // Business logic in UI components
      if (PATTERNS.UI_COMPONENT_FILE.test(currentFile) && PATTERNS.API_CALL.test(line)) {
        stats.separationConcerns.push({
          file: currentFile,
          detail: 'API calls in UI component - consider moving to service layer'
        });
      }

      // Mixed responsibilities
      if (PATTERNS.CLASS_DECLARATION.test(line) && currentFile.length > 300) {
        stats.separationConcerns.push({
          file: currentFile,
          detail: 'Large class - may have multiple responsibilities'
        });
      }
    }
  }

  // Test coverage analysis
  stats.testCoverage.modified = modifiedFiles.size;
  stats.testCoverage.tested = testFiles.size;

  // Refactor suggestions based on patterns
  if (stats.additions > THRESHOLDS.LARGE_CHANGE_LINES && stats.filesChanged.size === 1) {
    stats.refactorSuggestions.push('Large single-file change - consider splitting into smaller commits or modules');
  }

  if (modifiedFiles.size > THRESHOLDS.MANY_FILES_COUNT) {
    stats.refactorSuggestions.push('Many files modified - ensure changes are cohesive and related');
  }

  if (stats.testCoverage.modified > 0 && stats.testCoverage.tested === 0) {
    stats.refactorSuggestions.push('No test files modified - consider adding tests for changed code');
  }

  // Deduplicate issues
  stats.securityRisks = deduplicateIssues(stats.securityRisks);
  stats.maintainabilityIssues = deduplicateIssues(stats.maintainabilityIssues);
  stats.separationConcerns = deduplicateIssues(stats.separationConcerns);

  return {
    filesChanged: Array.from(stats.filesChanged),
    additions: stats.additions,
    deletions: stats.deletions,
    hasTests: stats.hasTests,
    hasDocChanges: stats.hasDocChanges,
    breakingChanges: stats.breakingChanges,
    securityRisks: stats.securityRisks,
    maintainabilityIssues: stats.maintainabilityIssues,
    separationConcerns: stats.separationConcerns,
    testCoverage: stats.testCoverage,
    refactorSuggestions: stats.refactorSuggestions
  };
}

/**
 * Deduplicate issues by file and type
 */
function deduplicateIssues(issues) {
  const seen = new Set();
  return issues.filter(issue => {
    const key = `${issue.file}:${issue.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate comprehensive review comment markdown
 */
function generateReview(stats, diff) {
  let review = '## 🤖 Automated Code Review\n\n';

  // Change Summary
  review += '### 📊 Change Summary\n';
  review += `- **Files changed:** ${stats.filesChanged.length}\n`;
  review += `- **Lines added:** +${stats.additions}\n`;
  review += `- **Lines removed:** -${stats.deletions}\n`;
  review += `- **Net change:** ${stats.additions - stats.deletions > 0 ? '+' : ''}${stats.additions - stats.deletions}\n\n`;

  // Security Risks (CRITICAL)
  if (stats.securityRisks.length > 0) {
    review += '### 🚨 Security Risks\n\n';
    stats.securityRisks.forEach(risk => {
      const emoji = risk.severity === 'HIGH' ? '🔴' : risk.severity === 'MEDIUM' ? '🟡' : '🟢';
      review += `${emoji} **${risk.type}** (${risk.severity})\n`;
      review += `- File: \`${risk.file}\`\n`;
      review += `- ${risk.detail}\n\n`;
    });
  }

  // Breaking Changes
  if (stats.breakingChanges.length > 0) {
    review += '### ⚠️ Potential Breaking Changes\n\n';
    stats.breakingChanges.forEach(change => {
      review += `- \`${change.file}\`: ${change.detail}\n`;
    });
    review += '\n';
  }

  // Test Coverage
  review += '### 🧪 Test Coverage\n';
  if (stats.testCoverage.modified > 0) {
    const coverageRatio = stats.testCoverage.tested / stats.testCoverage.modified;
    if (stats.testCoverage.tested === 0) {
      review += '- ❌ No test files modified for code changes\n';
      review += `- ${stats.testCoverage.modified} implementation file(s) changed with no corresponding tests\n`;
    } else if (coverageRatio < THRESHOLDS.LOW_TEST_COVERAGE_RATIO) {
      review += '- ⚠️ Limited test coverage\n';
      review += `- ${stats.testCoverage.tested} test file(s) for ${stats.testCoverage.modified} implementation file(s)\n`;
    } else {
      review += '- ✅ Good test coverage\n';
      review += `- ${stats.testCoverage.tested} test file(s) for ${stats.testCoverage.modified} implementation file(s)\n`;
    }
  } else if (stats.hasTests) {
    review += '- ✅ Test files included\n';
  } else {
    review += '- ℹ️ No test files detected\n';
  }
  review += '\n';

  // Maintainability Issues
  if (stats.maintainabilityIssues.length > 0) {
    review += '### 🔧 Maintainability Concerns\n\n';
    const grouped = groupBy(stats.maintainabilityIssues, 'type');
    Object.keys(grouped).forEach(type => {
      review += `**${type}** (${grouped[type].length} instance${grouped[type].length > 1 ? 's' : ''})\n`;
      grouped[type].slice(0, THRESHOLDS.MAX_GROUPED_ISSUES).forEach(issue => {
        review += `- \`${issue.file}\`: ${issue.detail}\n`;
      });
      if (grouped[type].length > THRESHOLDS.MAX_GROUPED_ISSUES) {
        review += `- ... and ${grouped[type].length - THRESHOLDS.MAX_GROUPED_ISSUES} more\n`;
      }
      review += '\n';
    });
  }

  // Separation of Concerns
  if (stats.separationConcerns.length > 0) {
    review += '### 🏗️ Architecture & Separation of Concerns\n\n';
    stats.separationConcerns.forEach(concern => {
      review += `- \`${concern.file}\`: ${concern.detail}\n`;
    });
    review += '\n';
  }

  // Refactor Suggestions
  if (stats.refactorSuggestions.length > 0) {
    review += '### 💡 Refactor Suggestions\n\n';
    stats.refactorSuggestions.forEach(suggestion => {
      review += `- ${suggestion}\n`;
    });
    review += '\n';
  }

  // Modified Files
  review += '### 📝 Modified Files\n';
  stats.filesChanged.forEach(file => {
    review += `- \`${file}\`\n`;
  });
  review += '\n';

  // Documentation
  review += '### 📚 Documentation\n';
  review += stats.hasDocChanges ? '- ✅ Documentation updated\n' : '- ℹ️ No documentation changes\n';
  review += '\n';

  // Cleanup PR recognition
  if (stats.deletions > stats.additions * 2) {
    review += '### 🎉 Cleanup PR\n';
    review += 'This PR removes more code than it adds - nice cleanup work!\n\n';
  }

  // Overall assessment
  review += '### 📋 Overall Assessment\n';
  const criticalIssues = stats.securityRisks.filter(r => r.severity === 'HIGH').length + stats.breakingChanges.length;
  if (criticalIssues > 0) {
    review += `⚠️ **${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} found** - Please review before merging\n`;
  } else if (stats.maintainabilityIssues.length > 5 || stats.separationConcerns.length > 3) {
    review += '⚠️ Several maintainability concerns detected - Consider addressing before merge\n';
  } else if (stats.securityRisks.length === 0 && stats.testCoverage.tested > 0) {
    review += '✅ Looks good! No critical issues detected\n';
  } else {
    review += 'ℹ️ Review complete - Some suggestions provided above\n';
  }

  review += '\n---\n';
  review += '*This review was automatically generated by the GitHub MCP server*\n';
  review += '*Note: This is a static analysis tool and may have false positives. Always use human judgment.*';

  return review;
}

/**
 * Group array of objects by a property
 */
function groupBy(array, property) {
  return array.reduce((acc, item) => {
    const key = item[property];
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
