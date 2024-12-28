import { name, parse } from '../../src/services/parser/parsers/links.js';

describe('Links Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('https://example.com');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('https://example.com');
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

  describe('URL Pattern Matching', () => {
    test('should detect HTTP URLs', async () => {
      const result = await parse('Visit http://example.com');
      expect(result.value).toEqual({
        url: 'http://example.com',
        type: 'url'
      });
      expect(result.metadata.pattern).toBe('url');
      expect(result.metadata.originalMatch).toBe('http://example.com');
    });

    test('should detect HTTPS URLs', async () => {
      const result = await parse('Visit https://example.com');
      expect(result.value).toEqual({
        url: 'https://example.com',
        type: 'url'
      });
      expect(result.metadata.pattern).toBe('url');
      expect(result.metadata.originalMatch).toBe('https://example.com');
    });

    test('should handle URLs with paths and query params', async () => {
      const urls = [
        'https://example.com/path/to/page',
        'https://example.com/search?q=test&page=1',
        'https://example.com/path#section'
      ];

      for (const url of urls) {
        const result = await parse(`Visit ${url}`);
        expect(result.value.url).toBe(url);
        expect(result.metadata.pattern).toBe('url');
        expect(result.metadata.originalMatch).toBe(url);
      }
    });

    test('should handle URLs with special characters', async () => {
      const urls = [
        'https://example.com/path%20with%20spaces',
        'https://example.com/path+with+plus',
        'https://example.com/path_with_underscore'
      ];

      for (const url of urls) {
        const result = await parse(`Visit ${url}`);
        expect(result.value.url).toBe(url);
        expect(result.metadata.pattern).toBe('url');
        expect(result.metadata.originalMatch).toBe(url);
      }
    });
  });

  describe('Markdown Link Pattern', () => {
    test('should detect markdown links', async () => {
      const result = await parse('[Example](https://example.com)');
      expect(result.value).toEqual({
        url: 'https://example.com',
        text: 'Example',
        type: 'markdown'
      });
      expect(result.metadata.pattern).toBe('markdown_link');
      expect(result.metadata.originalMatch).toBe('[Example](https://example.com)');
    });

    test('should validate markdown link text', async () => {
      const invalidTexts = ['', ' ', '[nested]'];
      for (const text of invalidTexts) {
        const result = await parse(`[${text}](https://example.com)`);
        expect(result).toBeNull();
      }
    });

    test('should handle markdown links with complex URLs', async () => {
      const result = await parse('[Search](https://example.com/search?q=test&page=1#results)');
      expect(result.value.url).toBe('https://example.com/search?q=test&page=1#results');
      expect(result.metadata.pattern).toBe('markdown_link');
      expect(result.metadata.originalMatch).toBe('[Search](https://example.com/search?q=test&page=1#results)');
    });
  });

  describe('Inferred URLs', () => {
    test('should detect domain-only URLs', async () => {
      const result = await parse('Visit example.com');
      expect(result.value).toEqual({
        url: 'https://example.com',
        type: 'url'
      });
      expect(result.metadata.pattern).toBe('inferred_url');
      expect(result.metadata.originalMatch).toBe('example.com');
    });

    test('should handle various TLDs', async () => {
      const domains = [
        'example.com',
        'example.org',
        'example.net',
        'example.edu',
        'example.gov',
        'example.io'
      ];

      for (const domain of domains) {
        const result = await parse(`Visit ${domain}`);
        expect(result.value.url).toBe(`https://${domain}`);
        expect(result.metadata.pattern).toBe('inferred_url');
        expect(result.metadata.originalMatch).toBe(domain);
      }
    });

    test('should handle subdomains', async () => {
      const domains = [
        'blog.example.com',
        'sub1.sub2.example.com',
        'api.example.org'
      ];

      for (const domain of domains) {
        const result = await parse(`Visit ${domain}`);
        expect(result.value.url).toBe(`https://${domain}`);
        expect(result.metadata.pattern).toBe('inferred_url');
        expect(result.metadata.originalMatch).toBe(domain);
      }
    });
  });

  describe('URL Validation', () => {
    test('should handle invalid URLs', async () => {
      const invalidUrls = [
        'http:/example.com',  // Missing slash
        'https://invalid url.com',  // Space in domain
        'ftp://example.com',  // Unsupported protocol
        'http://.com',  // Missing domain
        'http://example.',  // Incomplete TLD
        'http:example.com'  // Missing slashes
      ];

      for (const url of invalidUrls) {
        const result = await parse(`Visit ${url}`);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed markdown links', async () => {
      const malformedLinks = [
        '[Example]()',  // Empty URL
        '[](https://example.com)',  // Empty text
        '[Example]https://example.com',  // Missing parentheses
        '[Example(https://example.com]'  // Mismatched brackets
      ];

      for (const link of malformedLinks) {
        const result = await parse(link);
        expect(result).toBeNull();
      }
    });
  });
});
