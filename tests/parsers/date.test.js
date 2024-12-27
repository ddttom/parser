import parser from '../../src/services/parser/index.js';

describe('Date Parser', () => {
  test('parses absolute dates', async () => {
    const result = await parser.parse('Meeting on January 20, 2024');
    expect(result.success).toBe(true);
    expect(result.result.parsed.date).toBe('2024-01-20');
  });

  test('parses relative dates', async () => {
    const result = await parser.parse('Meeting tomorrow');
    expect(result.success).toBe(true);
    expect(result.result.parsed.date).toBeDefined();
  });

  test('handles invalid dates', async () => {
    const result = await parser.parse('Meeting on invalid date');
    expect(result.success).toBe(true);
    expect(result.result.parsed.date).toBeUndefined();
  });
});
