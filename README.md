# Natural Language Parser for Personal Information Management

A sophisticated natural language processing library designed to parse and extract structured information from text. This library excels at understanding dates, tasks, priorities, and various metadata from natural language input.

The project uses ES Modules (ESM) with explicit `.js` extensions for all imports/exports.

**Explicitly avoiding TypeScript** for:

- Reduced build complexity
- Simplified maintenance
- Minimal toolchain requirements
- **Quality assurance through:**
  - Comprehensive documentation
  - Thorough testing
  - Clear code organization
  - Review processes

## Features

- **Comprehensive Text Analysis**: Extract multiple data points from natural text including:
  - Dates and times (supports ISO, natural language, and relative formats)
  - Tasks and actions
  - Priorities and urgency levels
  - Categories and tags
  - Locations
  - Projects and contexts
  - Dependencies
  - Participants and contacts
  - Reminders
  - Progress tracking
  - Cost information

### Parser System

1. **Standardized Parser Architecture**
   - Common base parser template
   - Simplified confidence level system:
     - HIGH: Explicit patterns with clear intent (e.g., [tag:important])
     - MEDIUM: Standard patterns with good context (e.g., #important)
     - LOW: Inferred patterns with less certainty
   - Pattern-based matching with priority
   - Rich metadata generation
   - Best match selection based on confidence levels

2. **Core Parsers:**
   - Date:
     - ISO format (YYYY-MM-DD)
     - Natural language (January 1st, 2024)
     - Relative dates:
       - Simple (today, tomorrow, yesterday)
       - Next weekday calculation:
         1. Add 7 days to current date
         2. While current day is not target weekday:
            - Add 1 day
         3. Return resulting date
         Example: "next wednesday" on Monday Jan 1st:
         - Start: Jan 1st (Monday)
         - Add 7 days: Jan 8th (Monday)
         - Add days until Wednesday: Jan 10th
   - Time (12/24h, periods)
   - Project (explicit, references)
   - Status (explicit, progress)
   - Tags (hashtags, categories)
   - Subject (cleanup, key terms)
   - Recurring (intervals, patterns)
   - Reminders (time-based, relative)
   - Priority (explicit, contextual)
   - Additional parsers:
     - Action (verbs, completion)
     - Attendees (lists, roles)
     - Categories (hierarchical)
     - Complexity (levels, scoring)
     - Contact (email, phone)
     - Context (preposition-based: at, in, during, using)
   - Contexts (@ notation, multiple contexts)
     - Dependencies (tasks)
     - Duration (explicit, natural)
     - Links (URLs, files)
     - Location (rooms, addresses)
     - Participants (lists, roles)

3. **Parser Features:**
   - Async/await support
   - Standardized error handling via error objects
   - Pattern-based matching with confidence levels
   - Rich metadata enrichment
   - Input validation
   - Best match selection
   - Test coverage (see [TESTING.md](../TESTING.md) for testing standards)

4. **Parser Compliance and Testing**

All parsers in `src/services/parser/parsers/` have been verified for compliance with the standardized architecture and testing standards:

- **Architecture Compliance**:
  - All parsers extend from base parser template
  - All implement pattern-based matching with priority
  - All generate complete metadata
  - All follow best match selection logic

- **Confidence Level Compliance**:
  - All parsers use standardized confidence enum:
    - HIGH: For explicit, unambiguous patterns (e.g., [tag:important])
    - MEDIUM: For standard, well-structured patterns (e.g., #important)
    - LOW: For inferred or ambiguous patterns
  - Consistent confidence levels across all parsers
  - No dynamic confidence adjustments

- **Return Format Compliance**:
  - All parsers return standardized objects with type, value, and metadata
  - All implement proper error handling with error objects
  - All use null returns appropriately for no matches

- **Testing Standards**:
  - All parsers have comprehensive test coverage following standardized structure:
    - Input validation (null, empty, undefined, non-string)
    - Return format (type, metadata, null cases)
    - Pattern matching (explicit, parameters, variations)
    - Confidence levels (HIGH, MEDIUM, LOW)
    - Error handling (invalid formats, malformed input)
  - Integration tests for complex scenarios and parser interactions
  - Edge case coverage for each parser
  - Performance testing for critical paths

- **Quality Standards**:
  - All parsers implement appropriate validation functions
  - All handle edge cases and invalid inputs
  - All include proper logging
  - All expose test hooks where needed

5. **Return Format:**

   ```javascript
   // Success (single match)
   {
       type: 'parsertype',
       value: {
           // Parser-specific structure
       },
       metadata: {
           confidence: String, // "HIGH" | "MEDIUM" | "LOW"
           pattern: String,
           originalMatch: String
       }
   }

   // Success (multiple matches)
   [
       {
           type: 'parsertype',
           value: {
               // Parser-specific structure
           },
           metadata: {
               confidence: String, // "HIGH" | "MEDIUM" | "LOW"
               pattern: String,
               originalMatch: String
           }
       }
   ]

   // No match
   null

   // Error
   {
       type: 'error',
       error: 'INVALID_INPUT',
       message: 'Input must be a non-empty string'
   }
   ```

- **Smart Pattern Recognition**: Uses advanced pattern matching with:
  - Context-aware parsing
  - Standardized confidence levels
  - Multiple format support
  - Validation and error handling

- **Extensible Architecture**:
  - Plugin-based parser system
  - Modular design
  - Easy to add new parsers
  - Comprehensive utility functions

## Installation

```bash
npm install
```

## Usage

```javascript
// ES Module import
import parser from './src/services/parser/index.js';

// Parse text with all parsers
const result = await parser.parse("Meeting with John tomorrow at 2pm #important");

// Parse with specific parsers
const result = await parser.parse("Meeting tomorrow", {
    exclude: ['complexity', 'cost']
});

// Example Response
{
    success: true,
    result: {
        raw: "Meeting with John tomorrow at 2pm #important",
        parsed: {
            date: "2024-01-20",
            time: "14:00",
            participants: ["John"],
            tags: ["important"]
        },
        metadata: {
            confidence: {
                date: "HIGH",
                time: "HIGH",
                participants: "MEDIUM",
                tags: "HIGH"
            },
            performance: {
                // Parser execution times
            }
        },
        summary: "Meeting with John on Jan 20, 2024 at 2:00 PM"
    }
}
```

## Architecture

The parser uses a modular architecture with specialized parsers for different types of information:

- **Core Parser Service**: Orchestrates parsing process and manages parser execution
- **Individual Parsers**: Specialized modules for specific data types
- **Utility Functions**: Shared functionality for date handling, pattern matching, etc.
- **Configuration Management**: Flexible parser configuration system

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:parser

# Run tests in watch mode
npm run test:watch
```

### Code Style

```bash
# Check code style
npm run lint

# Fix automatic style issues
npm run lint:fix
```

## Contributing

Please see [contributing.md](contributing.md) for detailed contribution guidelines.

## Project Structure

```bash
src/
├── services/
│   └── parser/
│       ├── formatters/    # Output formatting
│       ├── parsers/       # Individual parsers
│       └── utils/         # Shared utilities
├── config/               # Configuration
└── utils/               # Global utilities
```

## Testing 2

The project includes comprehensive test coverage for all parsers and utilities:

```bash
tests/
├── parsers/            # Individual parser tests
│   ├── base.test.js    # Base parser template tests
│   ├── complex-note.test.js  # Integration tests
│   ├── date.test.js    # Date parser tests
│   ├── priority.test.js # Priority parser tests
│   └── ...
└── helpers/           # Test utilities and helpers
    └── testUtils.js
```

Each parser test file follows a standardized structure:

1. Input Validation
   - Null input
   - Empty string
   - Undefined input
   - Non-string inputs (numbers, objects, arrays)

2. Return Format
   - Type property verification
   - Metadata structure validation
   - Null return cases

3. Pattern Matching
   - Explicit patterns
   - Parameter handling
   - Multiple formats
   - Edge cases

4. Confidence Levels
   - HIGH confidence for explicit patterns
   - MEDIUM confidence for standard patterns
   - LOW confidence for inferred patterns
   - Consistent levels for same pattern types

5. Error Handling
   - Invalid formats
   - Malformed parameters
   - Invalid values
   - Parser errors

## License

[MIT License](LICENSE)
