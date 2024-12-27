import parser from '../../src/services/parser/index.js';

describe('Priority Parser', () => {
  test('parses priority tags', async () => {
    const result = await parser.parse('Meeting #important');
    expect(result.success).toBe(true);
    expect(result.result.parsed.tags).toContain('important');
  });

  test('parses multiple priority levels', async () => {
    const result = await parser.parse('Meeting #urgent #high-priority');
    expect(result.success).toBe(true);
    expect(result.result.parsed.tags).toContain('urgent');
    expect(result.result.parsed.tags).toContain('high-priority');
  });
});
