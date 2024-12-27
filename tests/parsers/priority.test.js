import parser from '../../src/services/parser/index.js';

describe('Priority Parser', () => {
  test('parses priority tags', async () => {
    const result = await parser.parse('Meeting #important');
    expect(result).toEqual({
      success: true,
      result: {
        raw: 'Meeting #important',
        parsed: {
          priority: 'important',
          tags: ['important']
        },
        metadata: {
          confidence: expect.any(Number),
          performance: expect.any(Object)
        }
      }
    });
  });

  test('parses multiple priority levels', async () => {
    const result = await parser.parse('Meeting #urgent #high-priority');
    expect(result).toEqual({
      success: true,
      result: {
        raw: 'Meeting #urgent #high-priority',
        parsed: {
          priority: 'urgent',
          tags: ['urgent', 'high-priority']
        },
        metadata: {
          confidence: expect.any(Number),
          performance: expect.any(Object)
        }
      }
    });
  });
});
