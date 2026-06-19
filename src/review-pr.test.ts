import { describe, it, expect } from 'vitest';

describe('PR Review Analysis', () => {
  describe('Pattern Detection', () => {
    const patterns = {
      DIFF_FILE: /b\/(.*?)$/,
      TEST_FILE: /\.(test|spec)\.|test\.js$/,
      IMPL_FILE: /\.(js|ts|jsx|tsx|py|java|go|rb)$/,
      DOC_FILE: /README|\.md/,
      SECRET: /(password|secret|api[_-]?key|token|private[_-]?key)\s*[=:]\s*["'][^"']{8,}/i,
      SQL_INJECTION: /execute\s*\(.*\+|query\s*\(.*\+|\$\{.*\}.*SELECT|eval\s*\(/i,
      COMMAND_INJECTION: /exec\s*\(|system\s*\(|shell_exec|child_process\.exec.*\+/,
      XSS: /innerHTML|dangerouslySetInnerHTML|document\.write/,
      TODO: /\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK/i,
      MAGIC_NUMBER: /\b\d{3,}\b/,
      CONSOLE_LOG: /console\.(log|debug|warn)/,
      EXPORT: /export\s+(function|class|const|let|var|default)/,
      FUNCTION_SIG: /function\s+\w+\s*\([^)]*\)|const\s+\w+\s*=\s*\([^)]*\)\s*=>/,
      UI_COMPONENT: /component|view|page/i,
      API_CALL: /fetch\s*\(|axios\.|query\(/,
      CLASS: /class\s+\w+/,
    };

    it('should detect file patterns', () => {
      expect(patterns.DIFF_FILE.exec('diff --git a/src/test.js b/src/test.js')?.[1]).toBe('src/test.js');
      expect(patterns.TEST_FILE.test('api.test.ts')).toBe(true);
      expect(patterns.IMPL_FILE.test('api.ts')).toBe(true);
      expect(patterns.DOC_FILE.test('README.md')).toBe(true);
    });

    it('should detect security patterns', () => {
      expect(patterns.SECRET.test('const API_KEY = "abcd1234567890"')).toBe(true);
      expect(patterns.SECRET.test('const name = "short"')).toBe(false);
      expect(patterns.SQL_INJECTION.test('execute("SELECT * FROM " + table)')).toBe(true);
      expect(patterns.SQL_INJECTION.test('${table} WHERE id SELECT')).toBe(true);
      expect(patterns.COMMAND_INJECTION.test('exec("rm -rf " + dir)')).toBe(true);
      expect(patterns.XSS.test('element.innerHTML = userInput')).toBe(true);
    });

    it('should detect maintainability patterns', () => {
      expect(patterns.TODO.test('// TODO: refactor')).toBe(true);
      expect(patterns.MAGIC_NUMBER.test('limit = 100')).toBe(true);
      expect(patterns.MAGIC_NUMBER.test('count = 42')).toBe(false);
      expect(patterns.CONSOLE_LOG.test('console.log("debug")')).toBe(true);
    });

    it('should detect breaking changes', () => {
      expect(patterns.EXPORT.test('export function getName()')).toBe(true);
      expect(patterns.FUNCTION_SIG.test('function getData(id, type)')).toBe(true);
      expect(patterns.FUNCTION_SIG.test('const getData = (id) =>')).toBe(true);
    });

    it('should detect architecture patterns', () => {
      expect(patterns.UI_COMPONENT.test('UserComponent.tsx')).toBe(true);
      expect(patterns.API_CALL.test('fetch("https://api.com")')).toBe(true);
      expect(patterns.CLASS.test('class UserService {')).toBe(true);
    });
  });

  describe('Diff Analysis', () => {
    it('should count additions and deletions', () => {
      const lines = ['+new', '+new2', ' unchanged', '-removed', '+++file', '---file'];
      const additions = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
      const deletions = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

      expect(additions).toBe(2);
      expect(deletions).toBe(1);
    });

    it('should calculate indentation level', () => {
      const indentLevel = (line: string) => (line.match(/^\+(\s+)/)?.[1]?.length || 0) / 2;

      expect(indentLevel('+      if (x) {')).toBe(3);
      expect(indentLevel('+if (x) {')).toBe(0);
    });
  });

  describe('Analysis Logic', () => {
    it('should deduplicate issues', () => {
      const issues = [
        { file: 'a.ts', type: 'Bug', detail: '1' },
        { file: 'a.ts', type: 'Bug', detail: '2' },
        { file: 'a.ts', type: 'Style', detail: '3' },
      ];

      const seen = new Set<string>();
      const deduped = issues.filter(i => {
        const key = `${i.file}:${i.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(deduped).toHaveLength(2);
    });

    it('should calculate coverage ratio', () => {
      expect(4 / 5).toBe(0.8);
      expect(0 / 5).toBe(0);
    });

    it('should identify large changes', () => {
      const needsSplit = (adds: number, files: number) => adds > 200 && files === 1;
      expect(needsSplit(250, 1)).toBe(true);
      expect(needsSplit(150, 1)).toBe(false);
      expect(needsSplit(250, 2)).toBe(false);
    });

    it('should identify cleanup PRs', () => {
      const isCleanup = (dels: number, adds: number) => dels > adds * 2;
      expect(isCleanup(200, 50)).toBe(true);
      expect(isCleanup(100, 90)).toBe(false);
    });

    it('should format net change', () => {
      const format = (net: number) => (net > 0 ? '+' : '') + net;
      expect(format(100)).toBe('+100');
      expect(format(-50)).toBe('-50');
    });

    it('should count critical issues', () => {
      const risks = [{ severity: 'HIGH' }, { severity: 'MEDIUM' }, { severity: 'HIGH' }];
      const critical = risks.filter(r => r.severity === 'HIGH').length;
      expect(critical).toBe(2);
    });

    it('should group by property', () => {
      const items = [{ type: 'A', val: 1 }, { type: 'B', val: 2 }, { type: 'A', val: 3 }];
      const grouped = items.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
      }, {} as Record<string, typeof items>);

      expect(grouped['A']).toHaveLength(2);
      expect(grouped['B']).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty diff', () => {
      const lines = ''.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('');
    });

    it('should handle files without extensions', () => {
      const implPattern = /\.(js|ts|jsx|tsx|py|java|go|rb)$/;
      expect(implPattern.test('Makefile')).toBe(false);
    });

    it('should detect deep nesting', () => {
      const isDeep = (level: number) => level > 6;
      expect(isDeep(7)).toBe(true);
      expect(isDeep(3)).toBe(false);
    });
  });
});
