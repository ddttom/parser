# Natural Language Parser for Personal Information Management

A sophisticated natural language processing library designed to parse and extract structured information from text. This library excels at understanding dates, tasks, priorities, and various metadata from natural language input.

The project uses ES Modules (ESM) with explicit `.js` extensions for all imports/exports.

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
   - Consistent confidence scoring system:
     - High confidence (explicit patterns): >= 0.90
     - Medium confidence (standard patterns): >= 0.80
     - Low confidence (implicit patterns): <= 0.80
     - Invalid/uncertain matches: <= 0.70
   - Pattern-based matching with priority
   - Rich metadata generation
   - Best match selection
   - Confidence adjustments:
     - Position bonus: +0.05
     - Context bonus: +0.05
     - Multiple indicators: +0.05
     - Weak indicators: -0.05

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
     - Contexts (location, time)
     - Dependencies (tasks)
     - Duration (explicit, natural)
     - Links (URLs, files)
     - Location (rooms, addresses)
     - Participants (lists, roles)

3. **Parser Features:**
   - Async/await support
   - Standardized error handling via error objects
   - Pattern-based matching with confidence scoring
   - Rich metadata enrichment
   - Input validation
   - Best match selection
   - Test coverage (see [TESTING.md](../TESTING.md) for testing standards)

4. **Return Format:**

   ```javascript
   // Success (single match)
   {
       type: 'parsertype',
       value: {
           // Parser-specific structure
       },
       metadata: {
           confidence: Number,
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
               confidence: Number,
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
  - Confidence scoring
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
                date: 0.95,
                time: 0.9,
                participants: 0.85,
                tags: 0.95
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

## Testing2

The project includes comprehensive test coverage for all parsers and utilities:

```bash
tests/
└── parsers/            # Individual parser tests
    ├── date.test.js
    ├── priority.test.js
    └── ...
```

## License

[MIT License](LICENSE)
