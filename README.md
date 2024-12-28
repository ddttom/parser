# Text Perfection System

A staged processing pipeline that transforms informal text into well-formatted, standardized text while maintaining the original meaning.

## Features

- **Staged Processing**: Text flows through 6 specialized stages
- **Change Tracking**: Every transformation is tracked with position and confidence
- **Performance Monitoring**: Response times and resource usage tracked per stage
- **Error Handling**: Comprehensive error handling and recovery
- **Pure JavaScript**: No build steps or transpilation required

## Architecture

### Processing Stages

1. **Basic Text Structure**
   - Subject Parser: Standardizes subjects
   - Action Parser: Perfects verb forms

2. **Time-Related**
   - Date Parser: Standardizes dates to absolute form
   - Time Parser: Converts to 24-hour format
   - TimeBlock Parser: Formats time ranges
   - TimeOfDay Parser: Clarifies periods

3. **People and Places**
   - Participants Parser: Standardizes names
   - Attendees Parser: Formats attendee lists
   - Location Parser: Clarifies locations
   - Team Parser: Formats team references

4. **Project Structure**
   - Project Parser: Standardizes project references
   - Sprint Parser: Formats sprint mentions
   - Milestone Parser: Clarifies milestones

5. **Task Attributes**
   - Priority Parser: Standardizes priorities
   - Status Parser: Formats status indicators
   - Complexity Parser: Clarifies complexity
   - Cost Parser: Formats monetary values

6. **Metadata**
   - Tags Parser: Formats tags
   - Categories Parser: Standardizes categories
   - Version Parser: Formats version numbers

### Parser Interface

Each parser implements the perfect() interface:

```javascript
async function perfect(text) {
    return {
        text: string,        // Improved text
        corrections: [{      // Array of changes made
            type: string,    // Type of correction
            original: string,// Original text
            correction: string, // New text
            position: {      // Location in text
                start: number,
                end: number
            },
            confidence: 'HIGH' | 'MEDIUM' | 'LOW'
        }]
    };
}
```

## Usage

### Running the Server

```bash
# Start the server
node tests/server/index.js

# Server will be available at http://localhost:3000
```

### Using the API

```javascript
// Request
POST /parse
Content-Type: application/json

{
    "text": "urgent meeting tomorrow at 2pm with @john about project alpha #important",
    "options": {
        "exclude": ["tags"]  // Optional: exclude specific parsers
    }
}

// Response
{
    "success": true,
    "result": {
        "original": "urgent meeting tomorrow at 2pm with @john about project alpha #important",
        "perfected": "Urgent meeting on Tuesday, January 2, 2024 at 14:00 with John about Project Alpha #HighPriority",
        "stages": [{
            "stage": 1,
            "parsers": ["subject", "action"],
            "changes": [...],
            "duration": 12.5
        }, ...],
        "confidence": "HIGH",
        "totalDuration": 45.2
    }
}
```

### Using the Demo UI

1. Open http://localhost:3000 in your browser
2. Enter text in the input field
3. Click "Perfect Text" or use Ctrl/Cmd + Enter
4. View the results:
   - Original vs Perfected text comparison
   - Stage-by-stage changes
   - Confidence levels for each change
   - Performance metrics

## Creating New Parsers

1. Create a new file in src/services/parser/parsers/
2. Implement the perfect() interface
3. Add parser to appropriate stage in src/services/parser/index.js

Example:

```javascript
// src/services/parser/parsers/example.js
import { Confidence } from '../utils/confidence.js';

export const name = 'example';

export async function perfect(text) {
    // Find patterns to improve
    const match = findPattern(text);
    if (!match) return { text, corrections: [] };

    // Create correction
    const correction = {
        type: 'example_improvement',
        original: match.text,
        correction: improveText(match.text),
        position: {
            start: match.index,
            end: match.index + match.text.length
        },
        confidence: Confidence.HIGH
    };

    // Apply correction
    const before = text.substring(0, correction.position.start);
    const after = text.substring(correction.position.end);
    const perfectedText = before + correction.correction + after;

    return {
        text: perfectedText,
        corrections: [correction]
    };
}
```

## Performance Optimization

1. **Parser Optimization**
   - Use efficient regex patterns
   - Cache compiled regex
   - Minimize string operations

2. **Stage Optimization**
   - Order parsers by likelihood of matches
   - Skip unnecessary stages
   - Cache intermediate results

3. **Memory Management**
   - Avoid large object creation
   - Clean up resources
   - Use string slicing over concatenation

4. **Error Handling**
   - Fail fast for invalid input
   - Isolate parser failures
   - Log errors for debugging

## Testing

```bash
# Run all tests
npm test

# Run specific parser tests
npm test -- tests/parsers/date.test.js

# Run performance tests
npm run test:perf
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
