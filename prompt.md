# Natural Language Parser System Refactoring Task

## Context

### Current State (README.md)

The system currently has:

- 25 specialized parsers in `/src/services/parser/parsers/`
- Pattern-based information extraction
- Individual parser operation
- Simple plugin architecture
- Comprehensive test coverage
- No TypeScript dependencies

### Target State (PRD.md)

Transform this into:

- A staged processing pipeline
- Text perfection focus
- Sequential parser operation
- Change tracking
- Detailed transformation history
- Performance metrics

## Required Changes

### Core Architecture Changes

1. Transform the parser service from:

```javascript
// Current (src/services/parser/index.js)
class ParserService {
    async parse(text) {
        // Run all parsers independently
        const results = await Promise.all(
            this.parsers.map(p => p.parse(text))
        );
        return combineResults(results);
    }
}
```

To:

```javascript
// Target
class ParserService {
    constructor() {
        // Define processing stages
        this.stages = [
            ['subject', 'action'],
            ['date', 'time', 'timeBlock', 'timeOfDay'],
            ['participants', 'attendees', 'location', 'team'],
            ['project', 'sprint', 'milestone'],
            ['priority', 'status', 'complexity', 'cost'],
            ['tags', 'categories', 'version']
        ];
    }

    async perfect(text) {
        let currentText = text;
        const changes = [];

        for (const stage of this.stages) {
            const stageResult = await this.processStage(stage, currentText);
            currentText = stageResult.text;
            changes.push(...stageResult.changes);
        }

        return {
            original: text,
            perfected: currentText,
            changes
        };
    }
}
```

### Parser Transformations

Each parser in `/src/services/parser/parsers/` must be transformed following this pattern:

1. Action Parser from:

```javascript
// Current (action.js)
export async function parse(text) {
    const match = text.match(/action pattern/);
    return {
        action: {
            type: 'action',
            value: match[1],
            confidence: HIGH
        }
    };
}
```

To:

```javascript
// Target
export async function perfect(text) {
    const matches = text.match(/action pattern/);
    if (!matches) return { text, corrections: [] };

    const correction = {
        type: 'action_improvement',
        original: matches[0],
        correction: improvedText,
        position: { start: matches.index, end: matches.index + matches[0].length },
        confidence: HIGH
    };

    return {
        text: text.replace(matches[0], improvedText),
        corrections: [correction]
    };
}
```

### Stage Processing Requirements

Transform each parser group following this sequence:

#### Stage 1: Basic Text Structure

- Subject Parser: Standardize subjects/topics
  - Current: Extracts subject text
  - Target: Improves subject formatting
- Action Parser: Perfect verb forms
  - Current: Identifies actions
  - Target: Standardizes action descriptions

[Similar details for all 6 stages and their parsers...]

### Server Integration

Update /tests/server/server.test.js:

1. Endpoint Changes:

```javascript
// Current
app.post('/parse', async (req, res) => {
    const result = await parser.parse(text);
    res.json(result);
});

// Target
app.post('/parse', async (req, res) => {
    const { text, options } = req.body;
    const result = await parser.perfect(text, options);
    res.json({
        success: true,
        result: {
            original: text,
            perfected: result.text,
            stages: result.stages,
            changes: result.changes
        }
    });
});
```

2. Test Updates:

```javascript
// Add stage processing tests
test('should process text through all stages', async () => {
    const input = "urgent meeting tomorrow at 2pm";
    const response = await request(app)
        .post('/parse')
        .send({ text: input });
        
    expect(response.body.result.stages).toHaveLength(6);
    expect(response.body.result.perfected).toMatch(
        /Meeting on Tuesday, January 2, 2024 at 14:00/
    );
});
```

### Required Parsers

Convert each parser following these examples:

1. Date Parser:
   From: Extracting dates
   To: Converting relative to absolute dates
   Example: "tomorrow" → "Tuesday, January 2, 2024"

2. Time Parser:
   From: Extracting times
   To: Standardizing time formats
   Example: "2pm" → "14:00"

[Similar details for all 25 parsers...]

### Implementation Phases

1. Core Infrastructure (2 weeks)
   - Stage processing pipeline
   - Basic parser interface
   - Server endpoint updates

2. Basic Parsers (3 weeks)
   - Stage 1 parsers
   - Stage 2 parsers
   - Core test suite

3. Advanced Parsers (4 weeks)
   - Remaining parser stages
   - Integration tests
   - Performance tuning

4. Polish & Launch (1 week)
   - Documentation
   - Error handling
   - Final testing

### Success Criteria

1. Performance
   - Response time < 500ms (95th percentile)
   - Throughput > 100 req/sec
   - Memory usage < 512MB

2. Quality
   - All tests passing
   - No parser conflicts
   - Correct text improvements

3. Integration
   - Server API compatibility
   - Error handling
   - Logging/monitoring

Please provide a step-by-step implementation plan and ask any clarifying questions before proceeding with the implementation.
