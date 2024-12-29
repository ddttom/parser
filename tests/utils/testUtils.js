import { ParserService } from '../../src/services/parser/index.js';

export function createTestParser() {
  return new ParserService();
}

export function validateParserResult(result) {
  // Validate basic structure
  expect(result).toBeDefined();
  expect(result.success).toBeDefined();
  
  if (result.success) {
    expect(result.result).toBeDefined();
    expect(result.result).toEqual(expect.objectContaining({
      original: expect.any(String),
      perfected: expect.any(String),
      stages: expect.any(Array),
      confidence: expect.any(String),
      totalDuration: expect.any(Number)
    }));

    // Validate stages
    result.result.stages.forEach(stage => {
      expect(stage).toEqual(expect.objectContaining({
        stage: expect.any(Number),
        parsers: expect.any(Array),
        changes: expect.any(Array),
        duration: expect.any(Number)
      }));

      // Validate changes
      stage.changes.forEach(change => {
        if (!change.error) {
          expect(change).toEqual(expect.objectContaining({
            parser: expect.any(String),
            corrections: expect.any(Array),
            duration: expect.any(Number)
          }));

          // Validate corrections
          change.corrections.forEach(correction => {
            expect(correction).toEqual(expect.objectContaining({
              type: expect.any(String),
              original: expect.any(String),
              correction: expect.any(String),
              position: expect.objectContaining({
                start: expect.any(Number),
                end: expect.any(Number)
              }),
              confidence: expect.any(String)
            }));
          });
        } else {
          expect(change).toEqual(expect.objectContaining({
            parser: expect.any(String),
            error: expect.objectContaining({
              type: expect.any(String),
              message: expect.any(String)
            }),
            duration: expect.any(Number)
          }));
        }
      });
    });
  } else {
    expect(result.error).toBeDefined();
    expect(result.message).toBeDefined();
  }
}

export function validateParserCorrection(correction) {
  expect(correction).toEqual(expect.objectContaining({
    type: expect.any(String),
    original: expect.any(String), 
    correction: expect.any(String),
    position: expect.objectContaining({
      start: expect.any(Number),
      end: expect.any(Number)
    }),
    confidence: expect.any(String)
  }));
}

export function createMockText(text) {
  return {
    raw: text,
    parsed: {},
    metadata: {
      confidence: {},
      performance: {}
    }
  };
} 
