/**
 * Enhanced logger utility
 */
class Logger {
  constructor(context) {
    this.context = context;
    this.logLevel = 'info'; // Default log level for renderer process
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const dataString = data ? JSON.stringify(data, null, 2) : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message} ${dataString}`.trim();
  }

  error(message, error, data = {}) {
    if (this.shouldLog('error')) {
      if (error instanceof Error) {
        data.errorMessage = error.message;
        data.stack = error.stack;
      }
      console.error(this.formatMessage('error', message, data));
    }
  }

  warn(message, data) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  info(message, data) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  debug(message, data) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

export function createLogger(context) {
  return new Logger(context);
}
