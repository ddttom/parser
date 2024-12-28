import { parse } from '../../src/services/parser/parsers/decision.js';

describe('Decision Parser', () => {
    describe('Return Format', () => {
        test('should return object with decision key', async () => {
            const result = await parse('decided to use React');
            expect(result).toHaveProperty('decision');
        });

        test('should return null for no matches', async () => {
            const result = await parse('   ');
            expect(result).toBeNull();
        });

        test('should include all required properties', async () => {
            const result = await parse('decided to use React');
            const expectedProps = {
                decision: expect.any(String),
                type: expect.any(String),
                isExplicit: expect.any(Boolean),
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            };
            expect(result.decision).toMatchObject(expectedProps);
        });
    });

    describe('Pattern Matching', () => {
        test('should parse decided format with rationale', async () => {
            const variations = [
                'decided to adopt microservices because of scalability needs',
                'therefore, decided to use TypeScript because of type safety',
                'thus, decided to implement CI/CD because of automation needs'
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result.decision.type).toBe('technical');
                expect(result.decision.rationale).toBeTruthy();
                expect(result.decision.isExplicit).toBe(true);
            }
        });

        test('should parse choice format', async () => {
            const variations = [
                'choice: implement agile workflow because it fits team better',
                'choice: use MongoDB because of flexibility',
                'therefore, choice: adopt Docker because of containerization'
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result.decision.rationale).toBeTruthy();
                expect(result.decision.isExplicit).toBe(true);
            }
        });

        test('should parse selected format with alternative', async () => {
            const variations = [
                'selected React over Angular because of ecosystem',
                'selected MongoDB over PostgreSQL because of flexibility',
                'selected TypeScript over JavaScript because of type safety'
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result.decision.alternative).toBeTruthy();
                expect(result.decision.rationale).toBeTruthy();
                expect(result.decision.isExplicit).toBe(true);
            }
        });

        test('should parse going with format', async () => {
            const variations = [
                'going with cloud deployment because of cost efficiency',
                'therefore, going with React because of ecosystem',
                'thus, going with agile workflow because of flexibility'
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result.decision.rationale).toBeTruthy();
                expect(result.decision.isExplicit).toBe(false);
            }
        });
    });

    describe('Decision Types', () => {
        test('should identify technical decisions', async () => {
            const technical = [
                'decided to upgrade database',
                'choice: implement microservices',
                'selected Docker over VMs',
                'going with cloud deployment'
            ];

            for (const input of technical) {
                const result = await parse(input);
                expect(result.decision.type).toBe('technical');
            }
        });

        test('should identify process decisions', async () => {
            const process = [
                'decided to improve workflow',
                'choice: adopt agile methodology',
                'selected scrum over kanban',
                'going with new process'
            ];

            for (const input of process) {
                const result = await parse(input);
                expect(result.decision.type).toBe('process');
            }
        });

        test('should identify resource decisions', async () => {
            const resource = [
                'decided to hire new developer',
                'choice: outsource testing',
                'selected internal team over contractors',
                'going with team expansion'
            ];

            for (const input of resource) {
                const result = await parse(input);
                expect(result.decision.type).toBe('resource');
            }
        });

        test('should identify business decisions', async () => {
            const business = [
                'decided to update roadmap',
                'choice: revise strategy',
                'selected new market focus',
                'going with priority shift'
            ];

            for (const input of business) {
                const result = await parse(input);
                expect(result.decision.type).toBe('business');
            }
        });
    });

    describe('Context Words', () => {
        test('should handle context words', async () => {
            const contextual = [
                'therefore, decided to use React',
                'thus, going with TypeScript',
                'hence, selected MongoDB over PostgreSQL',
                'consequently, choice: adopt Docker'
            ];

            for (const input of contextual) {
                const result = await parse(input);
                expect(result).not.toBeNull();
                expect(result.decision.decision).toBeTruthy();
            }
        });
    });

    describe('Invalid Cases', () => {
        test('should handle invalid formats', async () => {
            const invalid = [
                'decided',
                'choice:',
                'selected over',
                'going with'
            ];

            for (const input of invalid) {
                const result = await parse(input);
                expect(result).toBeNull();
            }
        });

        test('should handle decision too short', async () => {
            const result = await parse('decided to a');
            expect(result).toBeNull();
        });

        test('should handle decision too long', async () => {
            const result = await parse(`decided to ${'a'.repeat(201)}`);
            expect(result).toBeNull();
        });

        test('should handle rationale too long', async () => {
            const result = await parse(`decided to use React because ${'a'.repeat(501)}`);
            expect(result).toBeNull();
        });
    });
});
