/**
 * Validates input for all parsers to ensure it meets basic requirements
 * @param {*} input - The input to validate
 * @returns {Object|null} Error object if validation fails, null if validation passes
 */
export function validateParserInput(input) {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  // Handle non-string inputs
  if (typeof input !== 'string') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  // Handle empty strings
  if (input.trim() === '') {
    return {
      type: 'error',
      error: 'INVALID_INPUT',
      message: 'Input must be a non-empty string'
    };
  }

  // Input is valid
  return null;
}
