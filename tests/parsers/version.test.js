import { name, parse } from '../../src/services/parser/parsers/version.js';

describe('Version Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('version 1.0.0');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('version 1.0.0');
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
    test('should detect version formats', async () => {
      const formats = [
        { input: 'version 1.0.0', match: 'version 1.0.0' },
        { input: 'v1.0.0', match: 'v1.0.0' }
      ];

      for (const { input, match } of formats) {
        const result = await parse(input);
        expect(result.value).toEqual({
          major: 1,
          minor: 0,
          patch: 0
        });
        expect(result.metadata.pattern).toBe('version');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });
  });

  describe('Version Validation', () => {
    test('should validate semantic versioning format', async () => {
      const validVersions = [
        { input: 'version 1.0.0', match: 'version 1.0.0' },
        { input: 'version 2.3.4', match: 'version 2.3.4' },
        { input: 'version 0.1.0', match: 'version 0.1.0' },
        { input: 'version 10.20.30', match: 'version 10.20.30' }
      ];

      for (const { input, match } of validVersions) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.metadata.pattern).toBe('version');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should parse version components correctly', async () => {
      const versions = [
        { input: 'version 2.3.4', major: 2, minor: 3, patch: 4 },
        { input: 'version 0.1.0', major: 0, minor: 1, patch: 0 },
        { input: 'version 10.20.30', major: 10, minor: 20, patch: 30 }
      ];

      for (const { input, major, minor, patch } of versions) {
        const result = await parse(input);
        expect(result.value).toEqual({ major, minor, patch });
        expect(result.metadata.pattern).toBe('version');
      }
    });

    test('should normalize version formats', async () => {
      const variations = [
        { input: 'V1.0.0', match: 'V1.0.0' },
        { input: 'version 1.0.0', match: 'version 1.0.0' }
      ];

      for (const { input, match } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          major: 1,
          minor: 0,
          patch: 0
        });
        expect(result.metadata.pattern).toBe('version');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid version format', async () => {
      const result = await parse('version');
      expect(result).toBeNull();
    });

    test('should handle empty version value', async () => {
      const result = await parse('version ');
      expect(result).toBeNull();
    });

    test('should handle invalid version formats', async () => {
      const invalidVersions = [
        'version 1',           // Missing minor and patch
        'version 1.0',         // Missing patch
        'version 1.0.0.0',     // Too many segments
        'version a.b.c',       // Non-numeric segments
        'version 1.0.x',       // Invalid segment
        'version -1.0.0',      // Negative version
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
        const result = await parse('version 1.0.0');
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
