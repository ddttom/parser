import { name, parse } from '../../src/services/parser/parsers/location.js';

describe('Location Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('in Room 123');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('in Room 123');
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
    test('should detect room locations', async () => {
      const variations = [
        'in Room 123',
        'at conference room A',
        'in the meeting room B',
        'Room 123 floor 3'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.type).toBe('room');
        expect(result.metadata.pattern).toBe('room_location');
      }
    });

    test('should detect office locations', async () => {
      const variations = [
        'in Office 456',
        'at the office A12',
        'Office B34 floor 2'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.type).toBe('office');
        expect(result.metadata.pattern).toBe('office_location');
      }
    });

    test('should detect building locations', async () => {
      const variations = [
        'in Building B',
        'at the building C',
        'Building D floor 5'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.type).toBe('building');
        expect(result.metadata.pattern).toBe('building_location');
      }
    });

    test('should detect locations with floor numbers', async () => {
      const variations = [
        { input: 'Room 123 floor 3', floor: '3' },
        { input: 'Office A12 level 2', floor: '2' },
        { input: 'Building B floor 5', floor: '5' }
      ];

      for (const { input, floor } of variations) {
        const result = await parse(input);
        expect(result.value.parameters).toEqual({ floor });
      }
    });

    test('should detect inferred locations', async () => {
      const variations = [
        'in the Main Lobby',
        'at the Reception Area',
        'in the Break Room'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.metadata.pattern).toBe('inferred_location');
      }
    });
  });

  describe('Location Types', () => {
    test('should infer room type', async () => {
      const roomLocations = [
        'in the Conference Room',
        'at the Meeting Room',
        'in Room 123'
      ];

      for (const input of roomLocations) {
        const result = await parse(input);
        expect(result.value.type).toBe('room');
      }
    });

    test('should infer office type', async () => {
      const officeLocations = [
        'in the Main Office',
        'at the Branch Office',
        'in Office 456'
      ];

      for (const input of officeLocations) {
        const result = await parse(input);
        expect(result.value.type).toBe('office');
      }
    });

    test('should infer building type', async () => {
      const buildingLocations = [
        'in the Main Building',
        'at the East Building',
        'in Building A'
      ];

      for (const input of buildingLocations) {
        const result = await parse(input);
        expect(result.value.type).toBe('building');
      }
    });

    test('should use unknown type for unrecognized locations', async () => {
      const unknownLocations = [
        'in the Garden',
        'at the Parking Lot',
        'in the Cafeteria'
      ];

      for (const input of unknownLocations) {
        const result = await parse(input);
        expect(result.value.type).toBe('unknown');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing location identifiers', async () => {
      const invalid = [
        'in Room',
        'at Office',
        'in Building'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid floor numbers', async () => {
      const invalid = [
        'Room 123 floor',
        'Office A12 level',
        'Building B floor level'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result.value.parameters).toBeUndefined();
      }
    });
  });
});
