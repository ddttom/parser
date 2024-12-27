import { jest } from '@jest/globals';
import { parse } from '../../src/services/parser/parsers/action.js';
import { parse as parseDate } from '../../src/services/parser/parsers/date.js';
import { parse as parseCost } from '../../src/services/parser/parsers/cost.js';
import { parse as parseTeam } from '../../src/services/parser/parsers/team.js';
import { parse as parseProject } from '../../src/services/parser/parsers/project.js';
import { parse as parseTime } from '../../src/services/parser/parsers/time.js';
import { parse as parsePriority } from '../../src/services/parser/parsers/priority.js';
import { parse as parseTags } from '../../src/services/parser/parsers/tags.js';

describe('Complex Note Parsing', () => {
    let now;

    beforeEach(() => {
        // Set a fixed date for consistent date parsing
        now = new Date('2024-01-01T12:00:00.000Z');
        jest.useFakeTimers();
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('parses complex note with multiple components', async () => {
        const note = "call Jamie next wednesday about project cheesecake blocks, the cost is estimated to be 10,000 and the team involving darren, neil and steve should be involved.";

        // Parse individual components
        const action = await parse(note);
        const date = await parseDate(note);
        const cost = await parseCost(note);
        const team = await parseTeam(note);
        const project = await parseProject(note);

        // Action assertions
        expect(action).toEqual({
            type: 'action',
            value: {
                verb: 'call',
                object: 'Jamie next wednesday about project cheesecake blocks',
                isComplete: false
            },
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            }
        });
        expect(action.metadata.confidence).toBeGreaterThanOrEqual(0.9);

        // Date assertions
        const nextWednesday = new Date(now);
        // First add 7 days, then find next Wednesday
        nextWednesday.setDate(now.getDate() + 7);
        while (nextWednesday.getDay() !== 3) { // 3 is Wednesday
            nextWednesday.setDate(nextWednesday.getDate() + 1);
        }
        expect(date).toEqual({
            type: 'date',
            value: nextWednesday.toISOString().split('T')[0],
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: 'next wednesday',
                format: 'relative'
            }
        });
        expect(date.metadata.confidence).toBeGreaterThanOrEqual(0.75);

        // Cost assertions
        expect(cost).toEqual({
            type: 'cost',
            value: {
                amount: 10000,
                currency: 'USD'
            },
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            }
        });
        expect(cost.metadata.confidence).toBeGreaterThanOrEqual(0.9);

        // Team assertions
        expect(team).toEqual({
            type: 'team',
            value: ['darren', 'neil', 'steve'],
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            }
        });
        expect(team.metadata.confidence).toBeGreaterThanOrEqual(0.85);

        // Project assertions
        expect(project).toEqual({
            type: 'project',
            value: {
                project: 'cheesecake',
                originalName: 'cheesecake'
            },
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String),
                indicators: expect.any(Array)
            }
        });
        expect(project.metadata.confidence).toBeGreaterThanOrEqual(0.85);

        // Combined result structure
        const combinedResult = {
            action: action.value.verb,
            date: date.value,
            cost: cost.value,
            team: team.value,
            project: project.value,
            metadata: {
                action: action.metadata,
                date: date.metadata,
                cost: cost.metadata,
                team: team.metadata,
                project: project.metadata
            }
        };

        // Verify the complete structure
        expect(combinedResult).toEqual({
            action: 'call',
            date: nextWednesday.toISOString().split('T')[0],
            cost: {
                amount: 10000,
                currency: 'USD'
            },
            team: ['darren', 'neil', 'steve'],
            project: {
                project: 'cheesecake',
                originalName: 'cheesecake'
            },
            metadata: {
                action: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                },
                date: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: 'next wednesday',
                    format: 'relative'
                },
                cost: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                },
                team: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                },
                project: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String),
                    indicators: expect.any(Array)
                }
            }
        });
    });

    test('parses complex note with different patterns', async () => {
        const note = "urgent meeting with @sarah and @mike tomorrow at 2pm regarding budget overrun of $25k for phase 2 of project moonshot #priority #finance";

        // Parse individual components
        const action = await parse(note);
        const date = await parseDate(note);
        const time = await parseTime(note);
        const cost = await parseCost(note);
        const team = await parseTeam(note);
        const project = await parseProject(note);
        const priority = await parsePriority(note);
        const tags = await parseTags(note);

        // Action assertions
        expect(action).toEqual({
            type: 'action',
            value: {
                verb: 'meet',
                object: 'with @sarah and @mike tomorrow at 2pm regarding budget overrun',
                isComplete: false
            },
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            }
        });

        // Only include defined values in combined result
        const combinedResult = {
            action: action?.value?.verb,
            ...(date?.value && time?.value ? { datetime: `${date.value}T${time.value}` } : {}),
            ...(cost?.value ? { cost: cost.value } : {}),
            ...(team?.value ? { team: team.value } : {}),
            ...(project?.value ? { project: project.value } : {}),
            ...(priority?.value ? { priority: priority.value } : {}),
            ...(tags?.value ? { tags: tags.value } : {}),
            metadata: {
                action: action?.metadata,
                ...(date?.metadata ? { date: date.metadata } : {}),
                ...(time?.metadata ? { time: time.metadata } : {}),
                ...(cost?.metadata ? { cost: cost.metadata } : {}),
                ...(team?.metadata ? { team: team.metadata } : {}),
                ...(project?.metadata ? { project: project.metadata } : {}),
                ...(priority?.metadata ? { priority: priority.metadata } : {}),
                ...(tags?.metadata ? { tags: tags.metadata } : {})
            }
        };

        // Tomorrow's date
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        // Verify the complete structure
        expect(combinedResult).toEqual({
            action: 'meet',
            datetime: `${tomorrow.toISOString().split('T')[0]}T14:00:00`,
            cost: {
                amount: 25000,
                currency: 'USD'
            },
            team: ['sarah', 'mike'],
            project: {
                project: 'moonshot',
                originalName: 'moonshot'
            },
            priority: {
                priority: 'urgent'
            },
            tags: ['priority', 'finance'],
            metadata: {
                action: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                },
                date: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: 'tomorrow',
                    format: 'relative'
                },
                time: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: '2pm'
                },
                cost: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                },
                team: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                },
                project: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String),
                    indicators: expect.any(Array)
                },
                priority: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: 'urgent',
                    level: expect.any(Number)
                },
                tags: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                }
            }
        });

        // Verify confidence levels
        expect(action.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        expect(date.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        expect(time.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        expect(cost.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        expect(team.metadata.confidence).toBeGreaterThanOrEqual(0.85);
        expect(project.metadata.confidence).toBeGreaterThanOrEqual(0.85);
        expect(priority.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        expect(tags.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('handles edge cases and invalid input gracefully', async () => {
        const note = "maybe meet with someone about $unknown-cost next month or in 2 weeks at invalid-time regarding project123";

        // Parse individual components
        const action = await parse(note);
        const date = await parseDate(note);
        const time = await parseTime(note);
        const cost = await parseCost(note);
        const project = await parseProject(note);

        // Action assertions - should detect 'meet' despite 'maybe'
        expect(action).toEqual({
            type: 'action',
            value: {
                verb: 'meet',
                object: 'with someone about $unknown-cost next month or in 2 weeks at invalid-time regarding project123',
                isComplete: false
            },
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            }
        });
        expect(action.metadata.confidence).toBeLessThanOrEqual(0.85); // Lower confidence due to uncertainty

        // For ambiguous dates, we just check that some date was parsed
        if (date) {
            expect(date).toEqual({
                type: 'date',
                value: expect.any(String), // Either next month or in 2 weeks
                metadata: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String),
                    format: expect.any(String)
                }
            });
            expect(date.metadata.confidence).toBeLessThanOrEqual(0.8); // Lower confidence due to ambiguity
        }

        // Time assertions - should handle invalid time gracefully
        expect(time).toBeNull(); // Invalid time format should return null

        // Cost assertions - should handle invalid cost format
        expect(cost).toBeNull(); // Invalid cost format should return null

        // Project assertions - should handle numeric project names
        expect(project).toEqual({
            type: 'project',
            value: {
                project: 'project123',
                originalName: 'project123'
            },
            metadata: {
                confidence: expect.any(Number),
                pattern: expect.any(String),
                originalMatch: expect.any(String),
                indicators: expect.any(Array)
            }
        });
        expect(project.metadata.confidence).toBeLessThanOrEqual(0.8); // Lower confidence for unusual format

        // Combined result should include only valid parsed components
        const combinedResult = {
            action: action.value.verb,
            date: date?.value,
            project: project.value,
            metadata: {
                action: action.metadata,
                ...(date?.metadata ? { date: date.metadata } : {}),
                project: project.metadata
            }
        };

        expect(combinedResult).toEqual({
            action: 'meet',
            date: expect.any(String),
            project: {
                project: 'project123',
                originalName: 'project123'
            },
            metadata: {
                action: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String)
                },
                date: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String),
                    format: expect.any(String)
                },
                project: {
                    confidence: expect.any(Number),
                    pattern: expect.any(String),
                    originalMatch: expect.any(String),
                    indicators: expect.any(Array)
                }
            }
        });
    });
});
