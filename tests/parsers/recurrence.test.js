import { name, parse } from '../../src/services/parser/parsers/recurring.js';

describe('Confidence Scoring', () => {
  test('should have higher confidence for explicit recurrence', async () => {
    const result = await parse('[recur:weekly]');
    expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should have lower confidence for natural recurrence', async () => {
    const result = await parse('every week');
    expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
  });
});
