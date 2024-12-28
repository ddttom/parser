import { name, parse } from '../../src/services/parser/parsers/cost.js';

describe('Cost Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('costs $100');
      expect(result.type).toBe(name);
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('matches natural cost expressions', async () => {
      const variations = [
        'costs $99.99',
        'price: $99.99',
        'budget is $99.99',
        'estimated to be $99.99'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          amount: 99.99,
          currency: 'USD'
        });
      }
    });

    test('matches amount expressions', async () => {
      const variations = [
        'amount: $150.00',
        'total of $150.00',
        'sum is $150.00'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          amount: 150.00,
          currency: 'USD'
        });
      }
    });

    test('matches currency at start', async () => {
      const variations = [
        '$200.00 for the project',
        '£150.00 total cost',
        '€100.00 budget'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.amount).toBe(parseFloat(input.match(/\d+\.\d+/)[0]));
      }
    });
  });

  describe('Currency Support', () => {
    test('handles USD format', async () => {
      const variations = [
        { input: 'costs $99.99', amount: 99.99, currency: 'USD' },
        { input: 'price is $150.00', amount: 150.00, currency: 'USD' },
        { input: 'budget: $200.00', amount: 200.00, currency: 'USD' }
      ];

      for (const { input, amount, currency } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({ amount, currency });
      }
    });

    test('handles GBP format', async () => {
      const variations = [
        { input: 'costs £75.50', amount: 75.50, currency: 'GBP' },
        { input: 'price is £120.00', amount: 120.00, currency: 'GBP' },
        { input: 'budget: £199.99', amount: 199.99, currency: 'GBP' }
      ];

      for (const { input, amount, currency } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({ amount, currency });
      }
    });

    test('handles EUR format', async () => {
      const variations = [
        { input: 'costs €80.00', amount: 80.00, currency: 'EUR' },
        { input: 'price is €145.50', amount: 145.50, currency: 'EUR' },
        { input: 'budget: €250.00', amount: 250.00, currency: 'EUR' }
      ];

      for (const { input, amount, currency } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({ amount, currency });
      }
    });
  });

  describe('Number Formats', () => {
    test('handles thousands with k suffix', async () => {
      const variations = [
        { input: 'costs $1.5k', amount: 1500 },
        { input: 'budget is $2k', amount: 2000 },
        { input: 'price: $5.5k', amount: 5500 }
      ];

      for (const { input, amount } of variations) {
        const result = await parse(input);
        expect(result.value.amount).toBe(amount);
      }
    });

    test('handles comma-separated thousands', async () => {
      const variations = [
        { input: 'costs $1,500.00', amount: 1500 },
        { input: 'budget is $2,000', amount: 2000 },
        { input: 'price: $10,500.50', amount: 10500.50 }
      ];

      for (const { input, amount } of variations) {
        const result = await parse(input);
        expect(result.value.amount).toBe(amount);
      }
    });

    test('handles whole numbers', async () => {
      const variations = [
        { input: 'costs $100', amount: 100 },
        { input: 'budget is $250', amount: 250 },
        { input: 'price: $500', amount: 500 }
      ];

      for (const { input, amount } of variations) {
        const result = await parse(input);
        expect(result.value.amount).toBe(amount);
      }
    });
  });

  describe('Error Handling', () => {
    test('handles invalid number formats', async () => {
      const invalid = [
        'costs $abc',
        'price is $1.2.3',
        'budget: $'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('handles negative numbers', async () => {
      const invalid = [
        'costs $-50.00',
        'price is -$100',
        'budget: £-200'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result?.type).toBe('error');
      }
    });

    test('handles invalid decimal formats', async () => {
      const invalid = [
        'costs $50.123',
        'price is $100.0',
        'budget: £200.5'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result?.type).toBe('error');
      }
    });
  });
});
