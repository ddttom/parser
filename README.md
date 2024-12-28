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
  - Dates and times (supports natural language and relative formats)
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
     - HIGH: Strong natural language patterns with clear intent (e.g., "high priority", "costs $100")
     - MEDIUM: Standard patterns with good context (e.g., "#important", "@team")
     - LOW: Inferred patterns with less certainty (e.g., "sometime next week")
   - Pattern-based matching with priority
   - Best match selection based on confidence levels

2. **Core Parsers:**
   - Date:
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
   - Project (references, contexts)
   - Status (progress, state)
   - Tags (hashtags, categories)
   - Subject (key terms)
   - Recurring (intervals, patterns)
   - Reminders (time-based, relative)
   - Priority (natural language, hashtags)
   - Additional parsers:
     - Action (verbs, completion)
     - Attendees (lists, roles)
     - Categories (hierarchical)
     - Complexity (levels, scoring)
     - Contact (email, phone)
     - Context (preposition-based: at, in, during, using)
     - Contexts (@ notation, multiple contexts)
     - Dependencies (tasks)
     - Duration (natural language)
     - Links (URLs, files)
     - Location (rooms, addresses)
     - Participants (lists, roles)

3. **Parser Features:**
   - Async/await support
   - Standardized error handling via error objects
   - Pattern-based matching with confidence levels
   - Centralized input validation:
     - Common validation utility (validateParserInput) in utils/validation.js
     - Standardized validation for all parsers with consistent error messages
     - Handles:
       - Null input: `{ type: 'error', error: 'INVALID_INPUT', message: 'ParserName: Input cannot be null' }`
       - Undefined input: `{ type: 'error', error: 'INVALID_INPUT', message: 'ParserName: Input cannot be undefined' }`
       - Non-string input: `{ type: 'error', error: 'INVALID_INPUT', message: 'ParserName: Input must be a string, got typeof' }`
       - Empty strings: `{ type: 'error', error: 'INVALID_INPUT', message: 'ParserName: Input cannot be empty' }`
     - Parser-specific context in error messages
     - Full test coverage in tests/utils/validation.test.js
   - Best match selection
   - Test coverage (see [TESTING.md](../TESTING.md) for testing standards)

4. **Parser Compliance and Testing**

All parsers in `src/services/parser/parsers/` have been verified for compliance with the standardized architecture and testing standards:

- **Architecture Compliance**:
  - All implement pattern-based matching with priority
  - All follow best match selection logic

- **Confidence Level Compliance**:
  - All parsers use standardized confidence enum:
    - HIGH: Strong natural language patterns with clear intent
    - MEDIUM: Standard patterns with good context
    - LOW: Inferred patterns with less certainty
  - Consistent confidence levels across all parsers
  - No dynamic confidence adjustments

- **Return Format Compliance**:
  - All parsers return standardized objects with type and value
  - All implement proper error handling with error objects
  - All use null returns appropriately for no matches

- **Testing Standards**:
  - All parsers have comprehensive test coverage following standardized structure:
    - Return format (type, value structure, null cases)
    - Pattern matching (natural language, hashtags, variations)
    - Error handling (invalid formats, malformed input)
  - Integration tests for complex scenarios and parser interactions
  - Edge case coverage for each parser
  - Performance testing for critical paths
  - Input validation is handled centrally by validation.test.js

- **Quality Standards**:
  - All parsers implement appropriate validation functions
  - All handle edge cases and invalid inputs
  - All include proper logging
  - All expose test hooks where needed

1. **Return Format:**

   ```javascript
   // Success (single match)
   {
       [parserName]: {           // e.g., 'date', 'action'
           // Common fields
           confidence: number,    // Confidence level
           pattern: string,       // Pattern type that matched
           originalMatch: string, // Original matched text
           
           // Parser-specific fields
           ...parserFields       // Fields specific to each parser type
       }
   }

   // No match
   null

   // Error
   {
       [parserName]: {
           error: string,        // Error code
           message: string       // Error description
       }
   }
   ```

- **Smart Pattern Recognition**: Uses advanced pattern matching with:
  - Context-aware parsing
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
            date: {
                value: "2024-01-20",
                format: "relative",
                confidence: 0.95,
                pattern: "relative_date",
                originalMatch: "tomorrow"
            },
            time: {
                value: "14:00",
                format: "12h",
                confidence: 0.95,
                pattern: "time_12h",
                originalMatch: "2pm"
            },
            participants: {
                value: ["John"],
                confidence: 0.9,
                pattern: "name",
                originalMatch: "John"
            },
            tags: {
                value: ["important"],
                confidence: 0.95,
                pattern: "hashtag",
                originalMatch: "#important"
            }
        },
        performance: {
            // Parser execution times
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

tests/
├── parsers/            # Individual parser tests
├── server/            # Test server implementation
│   ├── index.js       # Server implementation
│   ├── server.test.js # Server tests
│   └── public/        # Static files
├── utils/             # Test utilities
└── helpers/           # Test helpers
```

## Test Server

The project includes a test server implementation in `tests/server/` that demonstrates how to use the parser in a REST API context. The server provides:

- `/parse` endpoint for processing text input
- Static file serving for demo UI
- Health check endpoint
- Comprehensive test coverage

To run the test server:

```bash
npm run test:server
```

This will start the server on <http://localhost:3000>. You can then make POST requests to `/parse` with JSON bodies containing a `text` field:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "High priority meeting tomorrow at 2pm"}' \
  http://localhost:3000/parse
```

## Testing2

The project includes comprehensive test coverage for all parsers and utilities. Input validation is handled by a centralized validation utility (tests/utils/validation.test.js) that ensures consistent validation across all parsers.

```bash
tests/
├── parsers/            # Individual parser tests
│   ├── base.test.js    # Base parser template tests
│   ├── complex-note.test.js  # Integration tests
│   ├── date.test.js    # Date parser tests
│   ├── priority.test.js # Priority parser tests
│   └── ...
├── utils/
│   └── validation.test.js  # Centralized input validation tests
└── helpers/           # Test utilities and helpers
    └── testUtils.js
```

Each parser test file focuses on parser-specific functionality with this standardized structure:

1. Return Format
   - Type property verification
   - Value structure validation
   - Null return cases

2. Pattern Matching
   - Natural language patterns
   - Hashtag patterns
   - Multiple formats
   - Edge cases

3. Error Handling
   - Invalid formats
   - Malformed parameters
   - Invalid values
   - Parser errors

## License

[MIT License](LICENSE)
