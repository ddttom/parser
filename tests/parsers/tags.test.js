import { name, parse } from '../../src/services/parser/parsers/tags.js';

describe('Tags Parser', () => {
    describe('Input Validation', () => {
        test('handles null input', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('handles empty string', async () => {
            const result = await parse('');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });
    });

    describe('Pattern Matching', () => {
        test('detects explicit tags', async () => {
            const result = await parse('[tag:important]');
            expect(result).toEqual({
                type: 'tag',
                value: ['important'],
                metadata: {
                    pattern: 'explicit_tag',
                    confidence: 0.95,
                    originalMatch: '[tag:important]'
                }
            });
        });

        test('detects hashtags', async () => {
            const result = await parse('#frontend #backend');
            expect(result).toEqual({
                type: 'tag',
                value: ['frontend', 'backend'],
                metadata: {
                    pattern: 'hashtag',
                    confidence: 0.80,
                    originalMatch: '#frontend #backend'
                }
            });
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit tags', async () => {
            const result = await parse('[tag:important]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for hashtag format', async () => {
            const result = await parse('#important');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('handles malformed tags', async () => {
            const result = await parse('#!invalid');
            expect(result).toBeNull();
        });

        test('handles parser errors gracefully', async () => {
            const result = await parse('#');
            expect(result).toBeNull();
        });
    });
});
