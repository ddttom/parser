import { name, parse } from '../../src/services/parser/parsers/location.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Location Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(String),
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.MEDIUM,
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
          confidence: Confidence.MEDIUM,
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
          confidence: Confidence.MEDIUM,
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
          confidence: Confidence.HIGH,
          originalMatch: '[location:Conference Room A(floor 3)]'
        }
      });
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for parameterized patterns', async () => {
      const result = await parse('[location:Conference Room A(floor 3)]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for standard patterns', async () => {
      const result = await parse('in Room 123');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have LOW confidence for implicit patterns', async () => {
      const result = await parse('in the meeting room');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
    });

    test('should maintain HIGH confidence for location at start of text', async () => {
      const result = await parse('[location:Conference Room A] is booked');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
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
