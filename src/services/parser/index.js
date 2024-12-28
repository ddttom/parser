// src/services/parser/index.js
import { createLogger } from '../../utils/logger.js';
import { compilePatterns } from './utils/patterns.js';
import { Confidence } from './utils/confidence.js';

// Import all parsers
import * as actionParser from './parsers/action.js';
import * as attendeesParser from './parsers/attendees.js';
import * as categoriesParser from './parsers/categories.js';
import * as complexityParser from './parsers/complexity.js';
import * as contactParser from './parsers/contact.js';
import * as contextsParser from './parsers/contexts.js';
import * as dateParser from './parsers/date.js';
import * as dependenciesParser from './parsers/dependencies.js';
import * as durationParser from './parsers/duration.js';
import * as linksParser from './parsers/links.js';
import * as locationParser from './parsers/location.js';
import * as participantsParser from './parsers/participants.js';
import * as priorityParser from './parsers/priority.js';
import * as projectParser from './parsers/project.js';
import * as recurringParser from './parsers/recurring.js';
import * as remindersParser from './parsers/reminders.js';
import * as statusParser from './parsers/status.js';
import * as subjectParser from './parsers/subject.js';
import * as tagsParser from './parsers/tags.js';
import * as timeParser from './parsers/time.js';
import * as timeOfDayParser from './parsers/timeOfDay.js';
import * as urgencyParser from './parsers/urgency.js';

const logger = createLogger('ParserService');

class ParserService {
    constructor() {
        this.parsers = new Map();
        this.parserStats = new Map();
        this.compiledPatterns = new Map();
        this.totalParses = 0;
        
        // Register all parsers
        this.registerParser(actionParser.name, actionParser);
        this.registerParser(attendeesParser.name, attendeesParser);
        this.registerParser(categoriesParser.name, categoriesParser);
        this.registerParser(complexityParser.name, complexityParser);
        this.registerParser(contactParser.name, contactParser);
        this.registerParser(contextsParser.name, contextsParser);
        this.registerParser(dateParser.name, dateParser);
        this.registerParser(dependenciesParser.name, dependenciesParser);
        this.registerParser(durationParser.name, durationParser);
        this.registerParser(linksParser.name, linksParser);
        this.registerParser(locationParser.name, locationParser);
        this.registerParser(participantsParser.name, participantsParser);
        this.registerParser(priorityParser.name, priorityParser);
        this.registerParser(projectParser.name, projectParser);
        this.registerParser(recurringParser.name, recurringParser);
        this.registerParser(remindersParser.name, remindersParser);
        this.registerParser(statusParser.name, statusParser);
        this.registerParser(subjectParser.name, subjectParser);
        this.registerParser(tagsParser.name, tagsParser);
        this.registerParser(timeParser.name, timeParser);
        this.registerParser(timeOfDayParser.name, timeOfDayParser);
        this.registerParser(urgencyParser.name, urgencyParser);
    }

    registerParser(name, parser) {
        if (!parser.parse || typeof parser.parse !== 'function') {
            throw new Error(`Invalid parser: ${name} must have a parse method`);
        }

        // Compile patterns if parser has them
        if (parser.patterns) {
            this.compiledPatterns.set(name, compilePatterns(parser.patterns));
        }

        this.parsers.set(name, parser);
        logger.info(`Parser registered: ${name}`);
    }

    async parse(text, options = {}) {
        if (!text || typeof text !== 'string') {
            logger.warn('Invalid input:', { text });
            return {
                success: false,
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            };
        }

        try {
            logger.debug('Starting parse:', { text, options });
            const startTime = performance.now();

            const result = {
                raw: text,
                parsed: {},
                metadata: {
                    parsers: {},
                    confidence: {},
                    performance: {},
                    tokens: this.tokenize(text)
                }
            };

            const errors = [];
            const orderedParsers = this.getOrderedParsers();
            
            for (const [name, parser] of orderedParsers) {
                const parserStartTime = performance.now();
                try {
                    if (options.exclude?.includes(name)) continue;

                    // Get compiled patterns for this parser
                    const patterns = this.compiledPatterns.get(name);
                    
                    const parserResult = await parser.parse(text, patterns);
                    if (parserResult === null) {
                        // No match found for this parser
                        continue;
                    }
                    
                    if (parserResult[name]?.error) {
                        // Handle error result
                        errors.push({
                            parser: name,
                            error: parserResult[name].error,
                            message: parserResult[name].message
                        });
                    } else if (parserResult[name]) {
                        // Handle successful result
                        const { confidence, pattern, originalMatch, ...parserFields } = parserResult[name];
                        result.parsed[name] = parserFields;
                        result.metadata.parsers[name] = {
                            confidence,
                            pattern,
                            originalMatch
                        };
                        result.metadata.confidence[name] = confidence;
                    }
                } catch (error) {
                    logger.error(`Parser ${name} failed:`, error);
                    errors.push({
                        parser: name,
                        error: 'PARSER_ERROR',
                        message: error.message
                    });
                }

                result.metadata.performance[name] = performance.now() - parserStartTime;
                this.updateParserStats(name, result.metadata.performance[name]);
            }

            // Post-process results
            this.postProcess(result);

            // Add timing and error information
            result.metadata.totalDuration = performance.now() - startTime;
            if (errors.length > 0) {
                result.metadata.errors = errors;
            }

            return {
                success: true,
                result
            };

        } catch (error) {
            logger.error('Parse failed:', error);
            return {
                success: false,
                error: 'PARSER_ERROR',
                message: error.message
            };
        }
    }

    // Break input text into tokens for more efficient parsing
    tokenize(text) {
        return text.toLowerCase()
                  .split(/\s+/)
                  .filter(token => token.length > 0);
    }

    // Post-process parsed results
    postProcess(result) {
        // Resolve cross-parser dependencies
        if (result.parsed.subject && result.parsed.date) {
            result.parsed.subject.deadline = result.parsed.date.value;
        }

        // Calculate overall confidence
        result.metadata.overallConfidence = this.calculateOverallConfidence(
            result.metadata.confidence
        );

        // Add parsed summary
        result.summary = this.generateSummary(result);
    }

    // Order parsers based on dependencies
    getOrderedParsers() {
        // Implement topological sort based on parser dependencies
        // For now, return existing parsers
        return Array.from(this.parsers.entries());
    }

    // Generate human-readable summary
    generateSummary(result) {
        const summary = [];
        
        // Subject/Task
        if (result.parsed.subject?.text) {
            summary.push(`Task: ${result.parsed.subject.text}`);
        }

        // Date and Time
        const date = result.parsed.date?.value;
        const time = result.parsed.time?.value;
        if (date || time) {
            let when = 'When:';
            if (date) when += ` ${new Date(date).toLocaleDateString()}`;
            if (time) when += ` at ${time}`;
            summary.push(when);
        }

        // Priority
        if (result.parsed.priority?.level) {
            summary.push(`Priority: ${result.parsed.priority.level}`);
        }

        // Location
        if (result.parsed.location?.value) {
            summary.push(`Location: ${result.parsed.location.value}`);
        }

        // Participants
        if (result.parsed.participants?.value?.length > 0) {
            summary.push(`Participants: ${result.parsed.participants.value.join(', ')}`);
        }

        // Tags
        if (result.parsed.tags?.value?.length > 0) {
            summary.push(`Tags: ${result.parsed.tags.value.map(tag => `#${tag}`).join(' ')}`);
        }

        return summary.join('\n');
    }

    // Update parser performance statistics
    updateParserStats(parserName, duration) {
        const stats = this.parserStats.get(parserName) || {
            totalTime: 0,
            count: 0,
            avgTime: 0
        };
        
        stats.totalTime += duration;
        stats.count += 1;
        stats.avgTime = stats.totalTime / stats.count;
        
        this.parserStats.set(parserName, stats);
        this.totalParses += 1;
    }

    // Calculate overall confidence level
    calculateOverallConfidence(confidenceScores) {
        if (!confidenceScores || Object.keys(confidenceScores).length === 0) {
            return Confidence.LOW;
        }

        const scores = Object.values(confidenceScores);
        const highCount = scores.filter(s => s === Confidence.HIGH).length;
        const mediumCount = scores.filter(s => s === Confidence.MEDIUM).length;
        
        if (highCount > scores.length / 2) return Confidence.HIGH;
        if (mediumCount > scores.length / 2) return Confidence.MEDIUM;
        return Confidence.LOW;
    }
}

export default new ParserService();
