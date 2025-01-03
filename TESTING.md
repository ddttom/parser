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
    [parserName]: {
        error: 'INVALID_INPUT',
        message: 'ParserName: Input cannot be null'
    }
}

// Undefined input
{
    [parserName]: {
        error: 'INVALID_INPUT',
        message: 'ParserName: Input cannot be undefined'
    }
}

// Non-string input
{
    [parserName]: {
        error: 'INVALID_INPUT',
        message: 'ParserName: Input must be a string, got typeof'
    }
}

// Empty string
{
    [parserName]: {
        error: 'INVALID_INPUT',
        message: 'ParserName: Input cannot be empty'
    }
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
                testParser: {
                    error: 'INVALID_INPUT',
                    message: 'TestParser: Input cannot be null'
                }
            });
        });

        test('should handle undefined input', () => {
            const result = validateParserInput(undefined, 'TestParser');
            expect(result).toEqual({
                testParser: {
                    error: 'INVALID_INPUT',
                    message: 'TestParser: Input cannot be undefined'
                }
            });
        });

        test('should handle non-string input', () => {
            const result = validateParserInput(123, 'TestParser');
            expect(result).toEqual({
                testParser: {
                    error: 'INVALID_INPUT',
                    message: 'TestParser: Input must be a string, got number'
                }
            });
        });

        test('should handle empty string input', () => {
            const result = validateParserInput('', 'TestParser');
            expect(result).toEqual({
                testParser: {
                    error: 'INVALID_INPUT',
                    message: 'TestParser: Input cannot be empty'
                }
            });
        });
    });

    describe('Parser Integration', () => {
        test('should use validation utility', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                testParser: {
                    error: 'INVALID_INPUT',
                    message: expect.stringContaining('Input cannot be null')
                }
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
- Verify null return for no matches
- Verify value structure matches parser's expected output format

### 3. Pattern Matching

- Test natural language patterns (e.g., "high priority", "costs $100")
- Test hashtag patterns (e.g., "#important", "#project")
- Test @ mention patterns (e.g., "@john", "@team")
- Test multiple format variations
- Test edge cases and boundary conditions

### Important Note About Confidence Levels

Confidence levels are determined by the parser implementation and should not be tested. They are part of the parser's internal logic for determining match quality:

- HIGH: Strong natural language patterns with clear intent (e.g., "high priority", "costs $100")
- MEDIUM: Standard patterns with good context (e.g., "#important", "@team")
- LOW: Inferred patterns with less certainty (e.g., "sometime next week")

While the metadata should include a confidence field, its specific value is an implementation detail that should not be part of the test suite.

### 4. Error Handling

- Test invalid format handling
- Test malformed pattern handling
- Test invalid value handling
- Test parser error handling and recovery

## Test Coverage Requirements

- All parsers must have 100% test coverage
- All pattern variations must be tested
- All error conditions must be tested

## Integration Testing

Integration tests should verify:

- Parser interactions work correctly
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

describe('Example Parser', () => {
  describe('Return Format', () => {
    test('should return object with parser name as key', async () => {
      const result = await parse('high priority task');
      expect(result).toHaveProperty('priority');
    });

    test('should include all required properties', async () => {
      const result = await parse('high priority task');
      expect(result.priority).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('no pattern here');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect natural language patterns', async () => {
      const result = await parse('high priority task');
      expect(result.priority).toEqual(expect.objectContaining({
        value: 'high',
        confidence: expect.any(Number),
        pattern: 'natural_language',
        originalMatch: 'high priority'
      }));
    });

    test('should handle hashtag patterns', async () => {
      const result = await parse('#important task');
      expect(result.priority).toEqual(expect.objectContaining({
        value: 'high',
        confidence: expect.any(Number),
        pattern: 'hashtag',
        originalMatch: '#important'
      }));
    });

    test('should handle edge cases', async () => {
      const result = await parse('very-high-priority');
      expect(result).not.toBeNull();
      expect(result.priority).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid format', async () => {
      const result = await parse('priority:');
      expect(result).toBeNull();
    });

    test('should handle malformed patterns', async () => {
      const result = await parse('priority(invalid)');
      expect(result).toBeNull();
    });

    test('should return error with parser name as key', async () => {
      const result = await parse(null);
      expect(result.priority).toEqual(expect.objectContaining({
        error: expect.any(String),
        message: expect.any(String)
      }));
    });
  });
});
```

Note: Input validation tests (null, empty string, undefined, non-string inputs) are now handled centrally by the validation utility in `tests/utils/validation.test.js`. Individual parsers should not implement or test basic input validation.

## Test Server

The project includes a test server implementation in `tests/server/` that demonstrates the parser's usage in a REST API context. The server tests verify:

### 1. Server Configuration

- Express middleware setup
- Static file serving
- Route configuration
- Error handling middleware

### 2. API Endpoints

#### POST /parse

- Input validation:
  - Required text field
  - String type validation
  - Length limits (1000 characters)
- Response format:
  - Success case includes parsed results
  - Error cases return appropriate status codes
  - Memory management (cleanup of large objects)
- Performance:
  - Response time monitoring
  - Memory usage tracking

#### GET /health

- Health check endpoint functionality
- Response format verification

### 3. Integration Testing

The server test suite (`tests/server/server.test.js`) verifies:

```javascript
describe('Parser Server', () => {
    // Server lifecycle
    beforeAll(async () => {
        server = await startServer(testPort);
    });
    afterAll((done) => {
        server.close(done);
    });

    // Health check
    it('should have health check endpoint', async () => {
        const response = await fetch(`http://localhost:${testPort}/health`);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'ok' });
    });

    // Input validation
    it('should handle missing text in parse request', async () => {
        const response = await fetch(`http://localhost:${testPort}/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        expect(response.status).toBe(400);
    });

    // Successful parsing
    it('should parse text successfully', async () => {
        const response = await fetch(`http://localhost:${testPort}/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'High priority meeting tomorrow at 2pm'
            })
        });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.result).toBeDefined();
    });
});
```

### 4. Running Server Tests

```bash
# Run all tests including server tests
npm test

# Run server tests specifically
npm run test:server

# Start test server for manual testing
node tests/server/index.js
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

# Run server tests
npm run test:server
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
