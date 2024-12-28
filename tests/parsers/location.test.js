import { name, parse } from '../../src/services/parser/parsers/location.js';

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
      expect(result.value).toEqual({
        name: 'Conference Room A',
        type: 'room'
      });
      expect(result.metadata.pattern).toBe('explicit_location');
      expect(result.metadata.originalMatch).toBe('[location:Conference Room A]');
    });

    test('should detect room locations', async () => {
      const result = await parse('in Room 123');
      expect(result.value).toEqual({
        name: 'Room 123',
        type: 'room'
      });
      expect(result.metadata.pattern).toBe('room_location');
      expect(result.metadata.originalMatch).toBe('Room 123');
    });

    test('should detect office locations', async () => {
      const result = await parse('at Office 456');
      expect(result.value).toEqual({
        name: 'Office 456',
        type: 'office'
      });
      expect(result.metadata.pattern).toBe('office_location');
      expect(result.metadata.originalMatch).toBe('Office 456');
    });

    test('should detect building locations', async () => {
      const result = await parse('in Building B');
      expect(result.value).toEqual({
        name: 'Building B',
        type: 'building'
      });
      expect(result.metadata.pattern).toBe('building_location');
      expect(result.metadata.originalMatch).toBe('Building B');
    });

    test('should detect locations with parameters', async () => {
      const result = await parse('[location:Conference Room A(floor 3)]');
      expect(result.value).toEqual({
        name: 'Conference Room A',
        type: 'room',
        parameters: {
          floor: '3'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized_location');
      expect(result.metadata.originalMatch).toBe('[location:Conference Room A(floor 3)]');
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
