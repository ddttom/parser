import { name, parse } from '../../src/services/parser/parsers/location.js';

describe('Location Parser', () => {
  describe('Input Validation', () => {
    test('should handle null input', async () => {
      const result = await parse(null);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle empty string', async () => {
      const result = await parse('');
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle undefined input', async () => {
      const result = await parse(undefined);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle non-string input', async () => {
      const numberResult = await parse(123);
      expect(numberResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const objectResult = await parse({});
      expect(objectResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const arrayResult = await parse([]);
      expect(arrayResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });
  });

  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit location markers', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result).toEqual({
        type: 'location',
        value: {
          name: 'Conference Room A',
          type: 'room'
        },
        metadata: {
          pattern: 'explicit_location',
          confidence: 0.95,
          originalMatch: '[location:Conference Room A]'
        }
      });
    });

    test('should detect room locations', async () => {
      const result = await parse('in Room 123');
      expect(result).toEqual({
        type: 'location',
        value: {
          name: 'Room 123',
          type: 'room'
        },
        metadata: {
          pattern: 'room_location',
          confidence: 0.85,
          originalMatch: 'Room 123'
        }
      });
    });

    test('should detect office locations', async () => {
      const result = await parse('at Office 456');
      expect(result).toEqual({
        type: 'location',
        value: {
          name: 'Office 456',
          type: 'office'
        },
        metadata: {
          pattern: 'office_location',
          confidence: 0.85,
          originalMatch: 'Office 456'
        }
      });
    });

    test('should detect building locations', async () => {
      const result = await parse('in Building B');
      expect(result).toEqual({
        type: 'location',
        value: {
          name: 'Building B',
          type: 'building'
        },
        metadata: {
          pattern: 'building_location',
          confidence: 0.85,
          originalMatch: 'Building B'
        }
      });
    });

    test('should detect locations with parameters', async () => {
      const result = await parse('[location:Conference Room A(floor 3)]');
      expect(result).toEqual({
        type: 'location',
        value: {
          name: 'Conference Room A',
          type: 'room',
          parameters: {
            floor: '3'
          }
        },
        metadata: {
          pattern: 'parameterized_location',
          confidence: 0.95,
          originalMatch: '[location:Conference Room A(floor 3)]'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('in Room 123');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('in the meeting room');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for location at start of text', async () => {
      const result = await parse('[location:Conference Room A] is booked');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[location:Conference Room A] is reserved');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid location format', async () => {
      const result = await parse('[location:]');
      expect(result).toBeNull();
    });

    test('should handle empty location name', async () => {
      const result = await parse('[location: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[location:Room A()]',
        '[location:Room A(floor)]',
        '[location:Room A(floor=)]',
        '[location:Room A(=3)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid location types', async () => {
      const result = await parse('in Invalid Location Type 123');
      expect(result.value.type).toBe('unknown');
    });
  });
});
