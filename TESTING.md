# Testing Standards

This document outlines the testing standards for the Natural Language Parser project.

## Parser Test Structure

Each parser test file should follow this standardized structure:

### 1. Input Validation

The project uses a centralized input validation system through the `validateParserInput` utility in `src/services/parser/utils/validation.js`. This utility ensures consistent input validation across all parsers.

#### Validation Utility

```javascript
import { validateParserInput } from '../utils/validation.js';

// In each parser's parse function:
export async function parse(text) {
    const validationError = validateParserInput(text, 'ParserName');
    if (validationError) {
        return validationError;
    }
    // ... parser-specific logic
}
```

#### Error Responses

The utility returns standardized error objects for invalid inputs:

```javascript
// Null input
{
    type: 'error',
    error: 'INVALID_INPUT',
    message: 'ParserName: Input cannot be null'
}

// Undefined input
{
    type: 'error',
    error: 'INVALID_INPUT',
    message: 'ParserName: Input cannot be undefined'
}

// Non-string input
{
    type: 'error',
    error: 'INVALID_INPUT',
    message: 'ParserName: Input must be a string, got typeof'
}

// Empty string
{
    type: 'error',
    error: 'INVALID_INPUT',
    message: 'ParserName: Input cannot be empty'
}
```

#### Testing Requirements

1. Validation Utility Tests (`tests/utils/validation.test.js`):
   - Test all invalid input cases
   - Verify error message formats
   - Check parser name inclusion
   - Ensure null return for valid input

2. Parser Integration Tests:
   - Verify parser uses validateParserInput
   - Confirm error objects are returned unmodified
   - Check no additional validation is performed
   - Test parser-specific error contexts

Example test structure:
```javascript
import { validateParserInput } from '../../src/services/parser/utils/validation.js';

describe('Input Validation', () => {
    describe('Validation Utility', () => {
        test('should return null for valid string input', () => {
            const result = validateParserInput('valid input', 'TestParser');
            expect(result).toBeNull();
        });

        test('should handle null input', () => {
            const result = validateParserInput(null, 'TestParser');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'TestParser: Input cannot be null'
            });
        });

        test('should handle undefined input', () => {
            const result = validateParserInput(undefined, 'TestParser');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'TestParser: Input cannot be undefined'
            });
        });

        test('should handle non-string input', () => {
            const result = validateParserInput(123, 'TestParser');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'TestParser: Input must be a string, got number'
            });
        });

        test('should handle empty string input', () => {
            const result = validateParserInput('', 'TestParser');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'TestParser: Input cannot be empty'
            });
        });
    });

    describe('Parser Integration', () => {
        test('should use validation utility', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: expect.stringContaining('Input cannot be null')
            });
        });

        test('should not perform additional validation', async () => {
            const result = await parse('valid input');
            // Verify parser proceeds to actual parsing logic
            expect(result).not.toHaveProperty('error');
        });
    });
});
```

#### Implementation Notes

- All parsers must use validateParserInput at the start of their parse function
- Error messages should include the parser name for context
- No parser should implement its own basic input validation
- The validation utility is the single source of truth for input validation

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
  describe('Pattern Matching', () => {
    test('should detect explicit patterns', async () => {
      const result = await parse('[example:test]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should handle multiple formats', async () => {
      const result = await parse('[example:test(param=value)]');
      expect(result.value).toEqual({
        test: 'test',
        param: 'value'
      });
    });

    test('should handle edge cases', async () => {
      const result = await parse('[example:test-with-hyphens]');
      expect(result).not.toBeNull();
    });
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

  describe('Return Format', () => {
    test('should return null for no matches', async () => {
      const result = await parse('no pattern here');
      expect(result).toBeNull();
    });

    test('should include required metadata', async () => {
      const result = await parse('[example:test]');
      expect(result.metadata).toEqual({
        confidence: Confidence.HIGH,
        pattern: 'explicit',
        originalMatch: '[example:test]'
      });
    });
  });
});
```

Note: Input validation tests are now handled by the validation utility in `tests/utils/validation.test.js`. Individual parsers should not implement or test basic input validation.

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
