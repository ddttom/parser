import { name, parse } from '../../src/services/parser/parsers/version.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Version Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[version:1.0.0]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[version:1.0.0]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(String),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit version markers', async () => {
      const result = await parse('[version:1.0.0]');
      expect(result).toEqual({
        type: 'version',
        value: {
          major: 1,
          minor: 0,
          patch: 0
        },
        metadata: {
          pattern: 'explicit_version',
          confidence: Confidence.HIGH,
          originalMatch: '[version:1.0.0]'
        }
      });
    });

    test('should detect version with parameters', async () => {
      const result = await parse('[version:1.0.0(stage=beta)]');
      expect(result).toEqual({
        type: 'version',
        value: {
          major: 1,
          minor: 0,
          patch: 0,
          parameters: {
            stage: 'beta'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: Confidence.HIGH,
          originalMatch: '[version:1.0.0(stage=beta)]'
        }
      });
    });

    test('should detect inferred version references', async () => {
      const formats = [
        { input: 'version 1.0.0', pattern: 'inferred_version' },
        { input: 'v1.0.0', pattern: 'shorthand_version' },
        { input: 'release 1.0.0', pattern: 'release_version' }
      ];

      for (const { input, pattern } of formats) {
        const result = await parse(input);
        expect(result.value).toEqual({
          major: 1,
          minor: 0,
          patch: 0
        });
        expect(result.metadata.pattern).toBe(pattern);
      }
    });

    test('should detect version with prerelease tags', async () => {
      const versions = [
        { input: '1.0.0-alpha', tag: 'alpha' },
        { input: '1.0.0-beta.1', tag: 'beta', number: 1 },
        { input: '1.0.0-rc.2', tag: 'rc', number: 2 }
      ];

      for (const { input, tag, number } of versions) {
        const result = await parse(`[version:${input}]`);
        expect(result.value).toEqual({
          major: 1,
          minor: 0,
          patch: 0,
          prerelease: {
            tag,
            number: number || undefined
          }
        });
      }
    });
  });

  describe('Version Validation', () => {
    test('should validate semantic versioning format', async () => {
      const validVersions = [
        '1.0.0',
        '2.3.4',
        '0.1.0',
        '10.20.30',
        '1.0.0-alpha',
        '1.0.0-beta.1'
      ];

      for (const version of validVersions) {
        const result = await parse(`[version:${version}]`);
        expect(result).not.toBeNull();
      }
    });

    test('should parse version components correctly', async () => {
      const versions = [
        { input: '2.3.4', major: 2, minor: 3, patch: 4 },
        { input: '0.1.0', major: 0, minor: 1, patch: 0 },
        { input: '10.20.30', major: 10, minor: 20, patch: 30 }
      ];

      for (const { input, major, minor, patch } of versions) {
        const result = await parse(`[version:${input}]`);
        expect(result.value).toEqual({ major, minor, patch });
      }
    });

    test('should normalize version formats', async () => {
      const variations = [
        { input: 'V1.0.0', expected: '1.0.0' },
        { input: 'version 1.0.0', expected: '1.0.0' },
        { input: 'release-1.0.0', expected: '1.0.0' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          major: 1,
          minor: 0,
          patch: 0
        });
      }
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[version:1.0.0]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for parameterized patterns', async () => {
      const result = await parse('[version:1.0.0(stage=beta)]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for inferred patterns', async () => {
      const result = await parse('version 1.0.0');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[version:1.0.0]');
      const result2 = await parse('[version:2.0.0]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid version format', async () => {
      const result = await parse('[version:]');
      expect(result).toBeNull();
    });

    test('should handle empty version value', async () => {
      const result = await parse('[version: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[version:1.0.0()]',
        '[version:1.0.0(stage)]',
        '[version:1.0.0(stage=)]',
        '[version:1.0.0(=beta)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid version formats', async () => {
      const invalidVersions = [
        '[version:1]',           // Missing minor and patch
        '[version:1.0]',         // Missing patch
        '[version:1.0.0.0]',     // Too many segments
        '[version:a.b.c]',       // Non-numeric segments
        '[version:1.0.x]',       // Invalid segment
        '[version:-1.0.0]',      // Negative version
        '[version:1.0.0-]',      // Empty prerelease
        '[version:1.0.0+]'       // Empty build metadata
      ];

      for (const version of invalidVersions) {
        const result = await parse(version);
        expect(result).toBeNull();
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Save original function
      const originalValidate = parse.validateVersion;

      // Replace with mock that throws
      parse.validateVersion = () => {
        throw new Error('Validation error');
      };

      try {
        const result = await parse('[version:1.0.0]');
        expect(result).toEqual({
          type: 'error',
          error: 'PARSER_ERROR',
          message: 'Validation error'
        });
      } finally {
        // Restore original function
        parse.validateVersion = originalValidate;
      }
    });
  });
});
