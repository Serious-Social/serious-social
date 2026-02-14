export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO ',
  [LogLevel.WARN]: 'WARN ',
  [LogLevel.ERROR]: 'ERROR',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[90m',  // gray
  [LogLevel.INFO]: '\x1b[36m',   // cyan
  [LogLevel.WARN]: '\x1b[33m',   // yellow
  [LogLevel.ERROR]: '\x1b[31m',  // red
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const CATEGORY_COLORS: Record<string, string> = {
  orchestrator: '\x1b[35m', // magenta
  bot: '\x1b[32m',          // green
  chain: '\x1b[34m',        // blue
  api: '\x1b[33m',          // yellow
  observer: '\x1b[36m',     // cyan
  wallet: '\x1b[95m',       // light magenta
  market: '\x1b[92m',       // light green
};

export class SimLogger {
  private minLevel: LogLevel;

  constructor(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    const map: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    };
    this.minLevel = map[level] ?? LogLevel.INFO;
  }

  log(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): void {
    if (level < this.minLevel) return;

    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const levelColor = LEVEL_COLORS[level];
    const levelLabel = LEVEL_LABELS[level];
    const catColor = CATEGORY_COLORS[category] || '\x1b[37m';

    let line = `${BOLD}[${time}]${RESET} ${levelColor}[${levelLabel}]${RESET} ${catColor}[${category}]${RESET} ${message}`;

    if (data) {
      const compact = Object.entries(data)
        .map(([k, v]) => `${k}=${typeof v === 'bigint' ? v.toString() : JSON.stringify(v)}`)
        .join(' ');
      line += ` ${'\x1b[90m'}${compact}${RESET}`;
    }

    console.log(line);
  }

  debug(category: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  /** Print a separator line for visual clarity */
  separator(char = '─', length = 60): void {
    console.log(`\x1b[90m${char.repeat(length)}${RESET}`);
  }

  /** Print a bold header */
  header(text: string): void {
    console.log(`\n${BOLD}${text}${RESET}`);
  }
}
