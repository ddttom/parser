import { name, parse } from '../../src/services/parser/parsers/reminders.js';

describe('Confidence Scoring', () => {
  test('should have higher confidence for explicit reminders', async () => {
    const result = await parse('[remind:2 days before]');
    expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should have lower confidence for natural reminders', async () => {
    const result = await parse('remind me tomorrow');
    expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
  });
});
