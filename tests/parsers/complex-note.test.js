import { jest } from '@jest/globals';
import { parse } from '../../src/services/parser/parsers/action.js';
import { parse as parseDate } from '../../src/services/parser/parsers/date.js';
import { parse as parseCost } from '../../src/services/parser/parsers/cost.js';
import { parse as parseTeam } from '../../src/services/parser/parsers/team.js';
import { parse as parseProject } from '../../src/services/parser/parsers/project.js';
import { parse as parseTime } from '../../src/services/parser/parsers/time.js';
import { parse as parsePriority } from '../../src/services/parser/parsers/priority.js';
import { parse as parseTags } from '../../src/services/parser/parsers/tags.js';
import { parse as parseStatus } from '../../src/services/parser/parsers/status.js';

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

  describe('Parser Interactions', () => {
    test('should handle overlapping patterns correctly', async () => {
      const note = "urgent meeting at 2pm tomorrow with project team about project deadline #urgent";
      
      const priority1 = await parsePriority(note);
      const priority2 = await parseTags(note);
      
      // Both parsers should detect urgency, but with different confidence levels
      expect(priority1.metadata.confidence).toBeGreaterThan(priority2.metadata.confidence);
    });

    test('should handle conflicting information gracefully', async () => {
      const note = "meeting tomorrow at 2pm and meeting today at 3pm";
      
      const date1 = await parseDate(note);
      const date2 = await parseDate(note.substring(note.indexOf('and')));
      
      // Should prioritize the first occurrence with higher confidence
      expect(date1.metadata.confidence).toBeGreaterThan(date2.metadata.confidence);
    });

    test('should maintain context across multiple parsers', async () => {
      const note = "project alpha: urgent meeting with @team tomorrow at 2pm #priority";
      
      const project = await parseProject(note);
      const team = await parseTeam(note);
      const priority = await parsePriority(note);
      const date = await parseDate(note);
      const time = await parseTime(note);
      
      // Project context should influence team confidence
      expect(team.metadata.confidence).toBeGreaterThanOrEqual(0.85);
      expect(project.value.project).toBe('alpha');
      expect(date.value).toBeDefined();
      expect(time.value).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
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
      nextWednesday.setDate(now.getDate() + 7);
      while (nextWednesday.getDay() !== 3) {
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

      // Verify all components were parsed correctly
      expect(action.value.verb).toBe('meet');
      expect(date.value).toBeDefined();
      expect(time.value).toBeDefined();
      expect(cost.value.amount).toBe(25000);
      expect(team.value).toEqual(['sarah', 'mike']);
      expect(project.value.project).toBe('moonshot');
      expect(priority.value.priority).toBe('urgent');
      expect(tags.value).toEqual(['priority', 'finance']);

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
  });

  describe('Error Handling', () => {
    test('handles parser failures gracefully', async () => {
      const note = "maybe meet with someone about $unknown-cost next month or in 2 weeks at invalid-time regarding project123";

      // Parse individual components
      const action = await parse(note);
      const date = await parseDate(note);
      const time = await parseTime(note);
      const cost = await parseCost(note);
      const project = await parseProject(note);

      // Action should be detected but with lower confidence
      expect(action.value.verb).toBe('meet');
      expect(action.metadata.confidence).toBeLessThanOrEqual(0.85);

      // Date should handle ambiguity
      if (date) {
        expect(date.metadata.confidence).toBeLessThanOrEqual(0.8);
      }

      // Invalid components should return null
      expect(time).toBeNull();
      expect(cost).toBeNull();

      // Project should be detected but with lower confidence
      expect(project.value.project).toBe('project123');
      expect(project.metadata.confidence).toBeLessThanOrEqual(0.8);
    });

    test('handles conflicting information gracefully', async () => {
      const note = "urgent not urgent meeting tomorrow and next week at 2pm and 3pm #low-priority";

      const priority1 = await parsePriority(note);
      const priority2 = await parseTags(note);
      const date1 = await parseDate(note);
      const date2 = await parseDate(note.substring(note.indexOf('and')));
      const time1 = await parseTime(note);
      const time2 = await parseTime(note.substring(note.indexOf('and')));

      // Should prioritize first occurrences and explicit patterns
      expect(priority1.metadata.confidence).toBeGreaterThan(priority2.metadata.confidence);
      expect(date1.metadata.confidence).toBeGreaterThan(date2.metadata.confidence);
      expect(time1.metadata.confidence).toBeGreaterThan(time2.metadata.confidence);
    });

    test('handles invalid combinations gracefully', async () => {
      const note = "completed task not started with @nonexistent-team for invalid-project #invalid-tag";

      const status1 = await parseStatus(note);
      const status2 = await parseStatus(note.substring(note.indexOf('not')));
      const team = await parseTeam(note);
      const project = await parseProject(note);
      const tags = await parseTags(note);

      // Should handle contradictory statuses
      expect(status1.metadata.confidence).toBeGreaterThan(status2.metadata.confidence);

      // Should handle invalid references
      expect(team).toBeNull();
      expect(project).toBeNull();
      expect(tags).toBeNull();
    });
  });
});
