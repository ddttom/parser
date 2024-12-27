# Contributing to PIM

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:

```bash
git clone https://github.com/yourusername/pim.git
cd pim
```

3. Install dependencies:

```bash
npm install
```

4. Create a branch for your feature:

```bash
git checkout -b feature/your-feature-name
```

## Development Workflow

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:parser
npm run test:config
npm run test:db

# Run tests in watch mode
npm run test:watch
```

### Code Style

We use ESLint with Airbnb style guide. Before committing:

```bash
# Check code style
npm run lint

# Fix automatic style issues
npm run lint:fix
```

## Project Structure

```bash
/src
├── main/           # Main process code
├── renderer/       # Renderer process code
├── services/       # Core services
│   ├── parser/     # Text parsing
│   ├── database/   # Data storage
│   └── sync/       # Cloud sync
└── utils/          # Shared utilities
```

### Key Components

#### Parser Service

- Handles natural language processing
- Extracts metadata from text
- Plugin-based architecture

#### Database Service

- JSON-based storage
- Transaction support
- Backup/restore functionality

#### Sync Service

- Cloud provider integration
- Data synchronization
- Conflict resolution

## Pull Request Process

1. Update documentation
2. Add/update tests
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Submit PR with description

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Code style follows guidelines
- [ ] Branch is up to date with main

## Release Process

1. Version Bump

```bash
npm version patch|minor|major
```

2. Update CHANGELOG.md
3. Create release PR
4. After merge, tag release
5. Create GitHub release

## Additional Resources

- [Issue Tracker](https://github.com/ddttom/pim/issues)
- [Project Wiki](https://github.com/ddttom/pim/wiki)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Questions?

Feel free to:

1. Open an issue
2. Contact maintainers

Thank you for contributing to PIM!
