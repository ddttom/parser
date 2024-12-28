/**
 * Validates input for all parsers to ensure it meets basic requirements
 * @param {*} input - The input to validate
 * @param {string} parserName - Name of the parser being used
 * @returns {Object|null} Error object if validation fails, null if validation passes
 */
export function validateParserInput(input, parserName) {
  const name = parserName.replace('Parser', '').toLowerCase();

  // Handle null
  if (input === null) {
    return {
      [name]: {
        error: 'INVALID_INPUT',
        message: `${parserName}: Input cannot be null`
      }
    };
  }

  // Handle undefined
  if (input === undefined) {
    return {
      [name]: {
        error: 'INVALID_INPUT',
        message: `${parserName}: Input cannot be undefined`
      }
    };
  }

  // Handle non-string inputs
  if (typeof input !== 'string') {
    return {
      [name]: {
        error: 'INVALID_INPUT',
        message: `${parserName}: Input must be a string, got ${typeof input}`
      }
    };
  }

  // Handle empty strings
  if (input.trim() === '') {
    return {
      [name]: {
        error: 'INVALID_INPUT',
        message: `${parserName}: Input cannot be empty`
      }
    };
  }

  // Input is valid
  return null;
}
