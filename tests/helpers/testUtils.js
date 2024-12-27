export const createMockText = (text) => ({
  raw: text,
  parsed: {},
  metadata: {
    confidence: {},
    performance: {},
  },
});

export const expectValidParserResult = (result) => {
  expect(result).toHaveProperty('success');
  expect(result).toHaveProperty('result');
  expect(result.result).toHaveProperty('raw');
  expect(result.result).toHaveProperty('parsed');
  expect(result.result).toHaveProperty('metadata');
  expect(result.result.metadata).toHaveProperty('confidence');
  expect(result.result.metadata).toHaveProperty('performance');
}; 
