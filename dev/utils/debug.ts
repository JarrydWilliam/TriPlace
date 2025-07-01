/**
 * Development Debug Utilities
 * Provides logging, debugging helpers, and development-only functionality
 */

import { DEBUG_CONFIG, DEBUG_UTILS } from '../configs/debug.config';

export class DevLogger {
  private static instance: DevLogger;
  private enabled: boolean;

  private constructor() {
    this.enabled = DEBUG_CONFIG.LOGGING.ENABLE_CONSOLE;
  }

  static getInstance(): DevLogger {
    if (!DevLogger.instance) {
      DevLogger.instance = new DevLogger();
    }
    return DevLogger.instance;
  }

  private formatMessage(level: string, prefix: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString().substr(11, 8);
    const coloredLevel = this.colorize(level, level.toUpperCase());
    const formattedMessage = `[${timestamp}] ${coloredLevel} ${prefix} ${message}`;
    
    if (data) {
      return `${formattedMessage}\n${JSON.stringify(data, null, 2)}`;
    }
    return formattedMessage;
  }

  private colorize(level: string, text: string): string {
    const colors = DEBUG_UTILS.COLORS;
    switch (level.toLowerCase()) {
      case 'info': return `${colors.INFO}${text}${colors.RESET}`;
      case 'warn': return `${colors.WARN}${text}${colors.RESET}`;
      case 'error': return `${colors.ERROR}${text}${colors.RESET}`;
      case 'success': return `${colors.SUCCESS}${text}${colors.RESET}`;
      default: return text;
    }
  }

  api(message: string, data?: any) {
    if (this.enabled && DEBUG_CONFIG.LOGGING.LOG_API_REQUESTS) {
      console.log(this.formatMessage('info', DEBUG_UTILS.PREFIXES.API, message, data));
    }
  }

  database(message: string, data?: any) {
    if (this.enabled && DEBUG_CONFIG.LOGGING.LOG_DATABASE_QUERIES) {
      console.log(this.formatMessage('info', DEBUG_UTILS.PREFIXES.DB, message, data));
    }
  }

  websocket(message: string, data?: any) {
    if (this.enabled && DEBUG_CONFIG.LOGGING.LOG_WEBSOCKET_EVENTS) {
      console.log(this.formatMessage('info', DEBUG_UTILS.PREFIXES.WS, message, data));
    }
  }

  ui(message: string, data?: any) {
    if (this.enabled) {
      console.log(this.formatMessage('info', DEBUG_UTILS.PREFIXES.UI, message, data));
    }
  }

  auth(message: string, data?: any) {
    if (this.enabled) {
      console.log(this.formatMessage('info', DEBUG_UTILS.PREFIXES.AUTH, message, data));
    }
  }

  info(message: string, data?: any) {
    if (this.enabled) {
      console.log(this.formatMessage('info', '', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.enabled) {
      console.warn(this.formatMessage('warn', '', message, data));
    }
  }

  error(message: string, data?: any) {
    if (this.enabled) {
      console.error(this.formatMessage('error', '', message, data));
    }
  }

  success(message: string, data?: any) {
    if (this.enabled) {
      console.log(this.formatMessage('success', '', message, data));
    }
  }
}

// Performance monitoring utilities
export class DevPerformance {
  private static timers: Map<string, number> = new Map();

  static start(label: string) {
    if (DEBUG_CONFIG.FEATURES.SHOW_PERFORMANCE_METRICS) {
      this.timers.set(label, performance.now());
    }
  }

  static end(label: string): number {
    if (!DEBUG_CONFIG.FEATURES.SHOW_PERFORMANCE_METRICS) return 0;
    
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);
    
    const logger = DevLogger.getInstance();
    logger.info(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }
}

// Development-only utilities
export const devUtils = {
  logger: DevLogger.getInstance(),
  performance: DevPerformance,
  
  // Mock data helpers
  generateId: () => Math.random().toString(36).substr(2, 9),
  
  // Component debugging
  logComponentRender: (componentName: string, props?: any) => {
    if (DEBUG_CONFIG.UI.SHOW_COMPONENT_NAMES) {
      DevLogger.getInstance().ui(`Rendering ${componentName}`, props);
    }
  },
  
  // API debugging
  logApiCall: (method: string, url: string, data?: any) => {
    DevLogger.getInstance().api(`${method} ${url}`, data);
  },
  
  // Database debugging
  logQuery: (query: string, params?: any) => {
    DevLogger.getInstance().database(`Query: ${query}`, params);
  },
  
  // WebSocket debugging
  logWsEvent: (event: string, data?: any) => {
    DevLogger.getInstance().websocket(`Event: ${event}`, data);
  }
};

// Export singleton logger
export const devLogger = DevLogger.getInstance();