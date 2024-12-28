import { name, perfect } from '../../src/services/parser/parsers/subject.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Subject Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('update documentation');
            expect(result).toEqual(expect.objectContaining({
                text: expect.any(String),
                corrections: expect.any(Array)
            }));
        });

        test('should return original text with empty corrections for no matches', async () => {
            const text = '   ';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should include all required correction properties', async () => {
            const result = await perfect('update documentation');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: 'subject_improvement',
                original: expect.any(String),
                correction: expect.any(String),
                position: expect.objectContaining({
                    start: expect.any(Number),
                    end: expect.any(Number)
                }),
                confidence: expect.any(String)
            }));
        });
    });

    describe('Text Improvement', () => {
        test('should capitalize first word', async () => {
            const result = await perfect('update documentation');
            expect(result.text).toBe('Update documentation');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should preserve technical terms', async () => {
            const result = await perfect('update API documentation');
            expect(result.text).toBe('Update API documentation');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should preserve proper nouns', async () => {
            const result = await perfect('update GitHub integration');
            expect(result.text).toBe('Update GitHub integration');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should remove redundant words', async () => {
            const result = await perfect('update the documentation the files');
            expect(result.text).toBe('Update documentation files');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should handle mixed case improvements', async () => {
            const result = await perfect('UPDATE DOCUMENTATION files');
            expect(result.text).toBe('Update documentation files');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });
    });

    describe('Text Cleanup', () => {
        test('should remove time references', async () => {
            const result = await perfect('review docs at 2:30pm');
            expect(result.text).toBe('Review docs');
        });

        test('should remove date references', async () => {
            const result = await perfect('submit report by Monday');
            expect(result.text).toBe('Submit report');
        });

        test('should remove project references', async () => {
            const result = await perfect('update UI for project Alpha');
            expect(result.text).toBe('Update UI');
        });

        test('should remove priority markers', async () => {
            const result = await perfect('high priority fix bug');
            expect(result.text).toBe('Fix bug');
        });

        test('should remove tags and mentions', async () => {
            const result = await perfect('review PR #frontend @john');
            expect(result.text).toBe('Review PR');
        });

        test('should handle multiple cleanup patterns', async () => {
            const result = await perfect('high priority review PR #frontend @john at 2:30pm by Monday for project Alpha');
            expect(result.text).toBe('Review PR');
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('update documentation');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'update documentation'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('URGENT: update documentation');
            expect(result.corrections[0].position).toEqual({
                start: 'URGENT: '.length,
                end: 'URGENT: update documentation'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('URGENT: update documentation!');
            expect(result.text).toBe('URGENT: Update documentation!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence for significant improvements', async () => {
            const result = await perfect('update THE documentation THE files');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence for case corrections', async () => {
            const result = await perfect('UPDATE DOCUMENTATION');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence for minor improvements', async () => {
            const result = await perfect('Update documentation');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid characters gracefully', async () => {
            const result = await perfect('Invalid \0 character');
            expect(result).toEqual({
                text: 'Invalid \0 character',
                corrections: []
            });
        });

        test('should handle control characters', async () => {
            const controlChars = ['\x08', '\x0B', '\x0C', '\x0E', '\x1F'];
            for (const char of controlChars) {
                const result = await perfect(`Test${char}text`);
                expect(result).toEqual({
                    text: `Test${char}text`,
                    corrections: []
                });
            }
        });

        test('should handle invalid subjects', async () => {
            const invalidSubjects = [
                'the task',
                'a report',
                'an update',
                'to review',
                'in progress'
            ];
            for (const subject of invalidSubjects) {
                const result = await perfect(subject);
                expect(result).toEqual({
                    text: subject,
                    corrections: []
                });
            }
        });
    });

    describe('Complex Cases', () => {
        test('should handle multiple improvements', async () => {
            const result = await perfect('update THE documentation AND improve THE code quality');
            expect(result.text).toBe('Update documentation improve code quality');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should preserve acronyms in mixed text', async () => {
            const result = await perfect('implement new API for OAuth authentication');
            expect(result.text).toBe('Implement new API OAuth authentication');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should handle mixed case and technical terms', async () => {
            const result = await perfect('UPDATE github INTEGRATION with API');
            expect(result.text).toBe('Update GitHub integration API');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should preserve formatting in surrounding text', async () => {
            const result = await perfect('[URGENT] update documentation (high priority)');
            expect(result.text).toBe('[URGENT] Update documentation (high priority)');
        });
    });
});
