# Testing Standards

This document outlines the testing standards for the Natural Language Parser project.

## Parser Test Structure

Each parser test file should follow this standardized structure:

### 1. Input Validation

- Test handling of null input
- Test handling of empty string
- Test handling of undefined input
- Test handling of non-string inputs (numbers, objects, arrays)

### 2. Return Format

- Verify type property matches parser name
- Validate metadata structure contains required fields:

  ```javascript
  {
    confidence: String, // "HIGH" | "MEDIUM" | "LOW"
    pattern: String,
    originalMatch: String
  }
  ```

- Verify null return for no matches

### 3. Pattern Matching

- Test explicit patterns (e.g., [tag:important])
- Test parameter handling (e.g., [tag:important(priority=high)])
- Test multiple format variations
- Test edge cases and boundary conditions

### 4. Confidence Levels

Test each confidence level with appropriate patterns:

#### HIGH Confidence

- Explicit, unambiguous patterns
- Example: [tag:important], [category:Work]
- Used when the pattern has clear intent and structure

#### MEDIUM Confidence

- Standard, well-structured patterns
- Example: #important, @work
- Used when the pattern follows common conventions

#### LOW Confidence

- Inferred or ambiguous patterns
- Example: "important task", "work related"
- Used when meaning must be derived from context

Verify that:

- Same pattern types consistently return same confidence level
- No dynamic confidence adjustments are made
- Each pattern type maps to appropriate confidence level

### 5. Error Handling

- Test invalid format handling
- Test malformed parameter handling
- Test invalid value handling
- Test parser error handling and recovery

## Test Coverage Requirements

- All parsers must have 100% test coverage
- All pattern variations must be tested
- All error conditions must be tested
- All confidence levels must be tested

## Integration Testing

Integration tests should verify:

- Parser interactions work correctly
- Confidence levels are used appropriately in parser selection
- Complex patterns are handled properly

## Performance Testing

Performance tests should verify:

- Parser execution time is within acceptable limits
- Memory usage is reasonable
- No significant performance degradation with larger inputs

## Test Utilities

Common test utilities are available in `tests/helpers/testUtils.js`:

- Input generators
- Pattern matchers
- Validation helpers
- Test data fixtures

## Writing New Tests

When writing new tests:

1. Follow the standard structure above
2. Use descriptive test names
3. Group related tests using describe blocks
4. Include comments explaining complex test cases
5. Use test utilities where appropriate

Example test structure:

```javascript
import { name, parse } from '../../src/services/parser/parsers/example.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Example Parser', () => {
  describe('Input Validation', () => {
    test('should handle null input', async () => {
      // Test code
    });
    // More input validation tests...
  });

  describe('Pattern Matching', () => {
    test('should detect explicit patterns', async () => {
      const result = await parse('[example:test]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });
    // More pattern matching tests...
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[example:test]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for standard patterns', async () => {
      const result = await parse('#test');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have LOW confidence for inferred patterns', async () => {
      const result = await parse('test related');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
    });
  });

  // More test groups...
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:parser

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Reports

Test reports should be generated and reviewed for:

- Test coverage
- Test execution time
- Failed tests
- Skipped tests

## Continuous Integration

All tests must pass in CI before merging:

- All unit tests pass
- All integration tests pass
- Coverage requirements met
- No performance regressions
