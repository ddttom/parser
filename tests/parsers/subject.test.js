import { name, parse } from '../../src/services/parser/parsers/subject.js';

describe('Subject Parser', () => {
    describe('Return Format', () => {
        test('should return correct type property', async () => {
            const result = await parse('Update documentation');
            expect(result.type).toBe(name);
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('Update documentation');
            expect(result.metadata).toEqual(expect.objectContaining({
                confidence: expect.any(String),
                pattern: expect.any(String),
                originalMatch: expect.any(String),
                hasActionVerb: expect.any(Boolean),
                removedParts: expect.any(Array)
            }));
        });

        test('should return null for no matches', async () => {
            const result = await parse('   ');
            expect(result).toBeNull();
        });
    });

    describe('Text Cleanup', () => {
        test('removes time references', async () => {
            const result = await parse('Review docs at 2:30pm');
            expect(result.value.text).toBe('Review docs');
            expect(result.metadata.removedParts).toContain('at 2:30pm');
        });

        test('removes date references', async () => {
            const result = await parse('Submit report by Monday');
            expect(result.value.text).toBe('Submit report');
            expect(result.metadata.removedParts).toContain('by Monday');
        });

        test('removes project references', async () => {
            const result = await parse('Update UI for project Alpha');
            expect(result.value.text).toBe('Update UI');
            expect(result.metadata.removedParts).toContain('for project Alpha');
        });

        test('removes priority markers', async () => {
            const result = await parse('High priority Fix bug');
            expect(result.value.text).toBe('Fix bug');
            expect(result.metadata.removedParts).toContain('High priority');
        });

        test('removes tags and mentions', async () => {
            const result = await parse('Review PR #frontend @john');
            expect(result.value.text).toBe('Review PR');
            expect(result.metadata.removedParts).toContain('#frontend');
            expect(result.metadata.removedParts).toContain('@john');
        });

        test('handles multiple cleanup patterns in one text', async () => {
            const result = await parse('High priority Review PR #frontend @john at 2:30pm by Monday for project Alpha');
            expect(result.value.text).toBe('Review PR');
            expect(result.metadata.removedParts).toContain('High priority');
            expect(result.metadata.removedParts).toContain('#frontend');
            expect(result.metadata.removedParts).toContain('@john');
            expect(result.metadata.removedParts).toContain('at 2:30pm');
            expect(result.metadata.removedParts).toContain('by Monday');
            expect(result.metadata.removedParts).toContain('for project Alpha');
        });

        test('preserves important text between cleanup patterns', async () => {
            const result = await parse('Review important documentation at 2:30pm with critical updates by Monday');
            expect(result.value.text).toBe('Review important documentation with critical updates');
            expect(result.metadata.removedParts).toContain('at 2:30pm');
            expect(result.metadata.removedParts).toContain('by Monday');
        });

        test('handles consecutive cleanup patterns', async () => {
            const result = await parse('Update UI at 2:30pm by Monday for project Alpha #frontend @john');
            expect(result.value.text).toBe('Update UI');
            expect(result.metadata.removedParts).toHaveLength(5);
        });
    });

    describe('Subject Validation', () => {
        test('validates minimum length', async () => {
            const result = await parse('a');
            expect(result).toBeNull();
        });

        test('validates start words', async () => {
            const invalidStarts = ['the', 'a', 'an', 'to', 'in'];
            for (const start of invalidStarts) {
                const result = await parse(`${start} task`);
                expect(result).toBeNull();
            }
        });

        test('rejects invalid subjects', async () => {
            const invalidSubjects = [
                'the task',
                'a report',
                'an update',
                'to review',
                'in progress'
            ];
            for (const subject of invalidSubjects) {
                const result = await parse(subject);
                expect(result).toBeNull();
            }
        });
    });

    describe('Key Terms', () => {
        test('extracts action verbs', async () => {
            const result = await parse('Create new documentation');
            expect(result.value.keyTerms).toContain('create');
            expect(result.metadata.hasActionVerb).toBe(true);
        });

        test('identifies significant terms', async () => {
            const result = await parse('Implement login feature');
            expect(result.value.keyTerms).toContain('implement');
            expect(result.value.keyTerms).toContain('login');
            expect(result.value.keyTerms).toContain('feature');
        });

        test('handles compound terms', async () => {
            const result = await parse('Update user authentication system');
            expect(result.value.keyTerms).toContain('update');
            expect(result.value.keyTerms).toContain('user');
            expect(result.value.keyTerms).toContain('authentication');
            expect(result.value.keyTerms).toContain('system');
        });

        test('excludes common stop words', async () => {
            const result = await parse('Implement the new login system with some features');
            expect(result.value.keyTerms).not.toContain('the');
            expect(result.value.keyTerms).not.toContain('with');
            expect(result.value.keyTerms).not.toContain('some');
        });

        test('handles multiple action verbs', async () => {
            const result = await parse('Create and update documentation');
            expect(result.value.keyTerms).toContain('create');
            expect(result.value.keyTerms).toContain('update');
            expect(result.metadata.hasActionVerb).toBe(true);
        });

        test('handles technical terms', async () => {
            const result = await parse('Debug API endpoints');
            expect(result.value.keyTerms).toContain('debug');
            expect(result.value.keyTerms).toContain('api');
            expect(result.value.keyTerms).toContain('endpoints');
        });
    });

    describe('Error Handling', () => {
        test('handles cleanup errors gracefully', async () => {
            const result = await parse('Invalid \0 character');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: expect.any(String)
            });
        });

        test('handles invalid control characters', async () => {
            const controlChars = ['\x08', '\x0B', '\x0C', '\x0E', '\x1F'];
            for (const char of controlChars) {
                const result = await parse(`Test${char}text`);
                expect(result).toEqual({
                    type: 'error',
                    error: 'PARSER_ERROR',
                    message: expect.any(String)
                });
            }
        });
    });

    describe('Metadata Validation', () => {
        test('includes all required metadata fields', async () => {
            const result = await parse('Update documentation');
            expect(result.metadata).toEqual(expect.objectContaining({
                confidence: expect.any(String),
                pattern: expect.any(String),
                originalMatch: expect.any(String),
                hasActionVerb: expect.any(Boolean),
                removedParts: expect.any(Array)
            }));
        });

        test('preserves original text in metadata', async () => {
            const text = 'Update docs at 2:30pm';
            const result = await parse(text);
            expect(result.metadata.originalMatch).toBe(text);
        });

        test('tracks all removed parts', async () => {
            const result = await parse('High priority Update docs at 2:30pm #docs @team');
            expect(result.metadata.removedParts).toHaveLength(4);
            expect(result.metadata.removedParts).toEqual(
                expect.arrayContaining(['High priority', 'at 2:30pm', '#docs', '@team'])
            );
        });
    });
});
