// src/services/parser/index.js
import { createLogger } from '../../utils/logger.js';
import { Confidence } from './utils/confidence.js';

// Import all parsers (alphabetically ordered)
import * as actionParser from './parsers/action.js';
import * as attendeesParser from './parsers/attendees.js';
import * as categoriesParser from './parsers/categories.js';
import * as complexityParser from './parsers/complexity.js';
import * as contactParser from './parsers/contact.js';
import * as contextParser from './parsers/context.js';
import * as contextsParser from './parsers/contexts.js';
import * as costParser from './parsers/cost.js';
import * as dateParser from './parsers/date.js';
import * as decisionParser from './parsers/decision.js';
import * as dependenciesParser from './parsers/dependencies.js';
import * as durationParser from './parsers/duration.js';
import * as linksParser from './parsers/links.js';
import * as locationParser from './parsers/location.js';
import * as milestoneParser from './parsers/milestone.js';
import * as participantsParser from './parsers/participants.js';
import * as priorityParser from './parsers/priority.js';
import * as progressParser from './parsers/progress.js';
import * as projectParser from './parsers/project.js';
import * as recurringParser from './parsers/recurring.js';
import * as remindersParser from './parsers/reminders.js';
import * as roleParser from './parsers/role.js';
import * as sprintParser from './parsers/sprint.js';
import * as statusParser from './parsers/status.js';
import * as subjectParser from './parsers/subject.js';
import * as tagsParser from './parsers/tags.js';
import * as taskParser from './parsers/task.js';
import * as teamParser from './parsers/team.js';
import * as timeParser from './parsers/time.js';
import * as timeBlockParser from './parsers/timeBlock.js';
import * as timeOfDayParser from './parsers/timeOfDay.js';
import * as urgencyParser from './parsers/urgency.js';
import * as versionParser from './parsers/version.js';

const logger = createLogger('ParserService');

class ParserService {
    constructor() {
        // Define processing stages
        this.stages = [
            // Basic Text Structure
            ['subject', 'action', 'decision'],
            
            // Time-Related
            ['date', 'time', 'timeBlock', 'timeOfDay', 'duration', 'recurring', 'reminders'],
            
            // People and Places
            ['participants', 'attendees', 'location', 'team', 'contact', 'role'],
            
            // Project Structure
            ['project', 'sprint', 'milestone', 'dependencies', 'links'],
            
            // Task Attributes
            ['priority', 'status', 'complexity', 'cost', 'progress', 'task', 'urgency'],
            
            // Context and Metadata
            ['tags', 'categories', 'version', 'context', 'contexts']
        ];

        this.parsers = new Map();
        this.parserStats = new Map();
        
        // Register all parsers (alphabetically ordered)
        this.registerParser(actionParser);
        this.registerParser(attendeesParser);
        this.registerParser(categoriesParser);
        this.registerParser(complexityParser);
        this.registerParser(contactParser);
        this.registerParser(contextParser);
        this.registerParser(contextsParser);
        this.registerParser(costParser);
        this.registerParser(dateParser);
        this.registerParser(decisionParser);
        this.registerParser(dependenciesParser);
        this.registerParser(durationParser);
        this.registerParser(linksParser);
        this.registerParser(locationParser);
        this.registerParser(milestoneParser);
        this.registerParser(participantsParser);
        this.registerParser(priorityParser);
        this.registerParser(progressParser);
        this.registerParser(projectParser);
        this.registerParser(recurringParser);
        this.registerParser(remindersParser);
        this.registerParser(roleParser);
        this.registerParser(sprintParser);
        this.registerParser(statusParser);
        this.registerParser(subjectParser);
        this.registerParser(tagsParser);
        this.registerParser(taskParser);
        this.registerParser(teamParser);
        this.registerParser(timeParser);
        this.registerParser(timeBlockParser);
        this.registerParser(timeOfDayParser);
        this.registerParser(urgencyParser);
        this.registerParser(versionParser);
    }

    registerParser(parser) {
        if (!parser.name || !parser.perfect || typeof parser.perfect !== 'function') {
            throw new Error(`Invalid parser: ${parser.name} must have a name and perfect method`);
        }

        this.parsers.set(parser.name, parser);
        logger.info(`Parser registered: ${parser.name}`);
    }

    async perfect(text, options = {}) {
        if (!text || typeof text !== 'string') {
            logger.warn('Invalid input:', { text });
            return {
                success: false,
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            };
        }

        try {
            logger.debug('Starting text perfection:', { text, options });
            const startTime = performance.now();

            let currentText = text;
            const stageResults = [];
            const allChanges = [];

            // Process each stage sequentially
            for (let stageIndex = 0; stageIndex < this.stages.length; stageIndex++) {
                const stageParsers = this.stages[stageIndex];
                const stageStartTime = performance.now();
                const stageChanges = [];

                // Process all parsers in this stage
                for (const parserName of stageParsers) {
                    const parser = this.parsers.get(parserName);
                    if (!parser || options.exclude?.includes(parserName)) continue;

                    const parserStartTime = performance.now();
                    try {
                        const result = await parser.perfect(currentText);
                        if (result.corrections.length > 0) {
                            currentText = result.text;
                            stageChanges.push({
                                parser: parserName,
                                corrections: result.corrections,
                                duration: performance.now() - parserStartTime
                            });
                        }
                    } catch (error) {
                        logger.error(`Parser ${parserName} failed:`, error);
                        stageChanges.push({
                            parser: parserName,
                            error: {
                                type: 'PARSER_ERROR',
                                message: error.message
                            },
                            duration: performance.now() - parserStartTime
                        });
                    }
                }

                // Record stage results
                const stageDuration = performance.now() - stageStartTime;
                stageResults.push({
                    stage: stageIndex + 1,
                    parsers: stageParsers,
                    changes: stageChanges,
                    duration: stageDuration,
                    text: currentText
                });

                allChanges.push(...stageChanges);
            }

            // Calculate overall confidence
            const overallConfidence = this.calculateOverallConfidence(allChanges);

            return {
                success: true,
                result: {
                    original: text,
                    perfected: currentText,
                    stages: stageResults,
                    confidence: overallConfidence,
                    totalDuration: performance.now() - startTime
                }
            };

        } catch (error) {
            logger.error('Text perfection failed:', error);
            return {
                success: false,
                error: 'PERFECTION_ERROR',
                message: error.message
            };
        }
    }

    // Calculate overall confidence based on all changes
    calculateOverallConfidence(changes) {
        if (!changes || changes.length === 0) return Confidence.LOW;

        const confidenceScores = changes
            .filter(change => !change.error)
            .flatMap(change => change.corrections || [])
            .map(correction => correction.confidence);

        if (confidenceScores.length === 0) return Confidence.LOW;

        const highCount = confidenceScores.filter(s => s === Confidence.HIGH).length;
        const mediumCount = confidenceScores.filter(s => s === Confidence.MEDIUM).length;
        
        if (highCount > confidenceScores.length / 2) return Confidence.HIGH;
        if (mediumCount > confidenceScores.length / 2) return Confidence.MEDIUM;
        return Confidence.LOW;
    }
}
export default new ParserService();
