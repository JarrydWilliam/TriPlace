/**
 * Testing Helper Utilities for Development
 * Provides common testing utilities and assertion helpers
 */

import { devLogger } from './debug';

export interface TestResult {
  passed: boolean;
  message: string;
  duration: number;
  error?: any;
}

export class TestRunner {
  private tests: Map<string, () => Promise<any> | any> = new Map();
  private results: TestResult[] = [];

  addTest(name: string, testFn: () => Promise<any> | any) {
    this.tests.set(name, testFn);
    devLogger.info(`Test registered: ${name}`);
  }

  async runTest(name: string): Promise<TestResult> {
    const testFn = this.tests.get(name);
    if (!testFn) {
      throw new Error(`Test not found: ${name}`);
    }

    const startTime = performance.now();
    let result: TestResult;

    try {
      await testFn();
      const duration = performance.now() - startTime;
      result = {
        passed: true,
        message: `Test '${name}' passed`,
        duration
      };
      devLogger.success(result.message);
    } catch (error) {
      const duration = performance.now() - startTime;
      result = {
        passed: false,
        message: `Test '${name}' failed: ${error.message}`,
        duration,
        error
      };
      devLogger.error(result.message, error);
    }

    this.results.push(result);
    return result;
  }

  async runAllTests(): Promise<TestResult[]> {
    devLogger.info(`Running ${this.tests.size} tests...`);
    
    const results = [];
    for (const [name] of this.tests) {
      const result = await this.runTest(name);
      results.push(result);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    
    devLogger.info(`Test Results: ${passed} passed, ${failed} failed`);
    return results;
  }

  getResults(): TestResult[] {
    return this.results;
  }

  clearResults() {
    this.results = [];
  }
}

// Assertion helpers
export const assert = {
  equals: (actual: any, expected: any, message?: string) => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },

  notEquals: (actual: any, expected: any, message?: string) => {
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} to not equal ${expected}`);
    }
  },

  truthy: (value: any, message?: string) => {
    if (!value) {
      throw new Error(message || `Expected truthy value, got ${value}`);
    }
  },

  falsy: (value: any, message?: string) => {
    if (value) {
      throw new Error(message || `Expected falsy value, got ${value}`);
    }
  },

  throws: async (fn: () => any, message?: string) => {
    try {
      await fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      // Expected
    }
  },

  arrayIncludes: (array: any[], item: any, message?: string) => {
    if (!array.includes(item)) {
      throw new Error(message || `Expected array to include ${item}`);
    }
  },

  objectHasProperty: (obj: any, property: string, message?: string) => {
    if (!(property in obj)) {
      throw new Error(message || `Expected object to have property ${property}`);
    }
  }
};

// API testing helpers
export const apiTestHelpers = {
  async testEndpoint(url: string, options: RequestInit = {}): Promise<Response> {
    devLogger.api(`Testing endpoint: ${url}`);
    const response = await fetch(url, options);
    devLogger.api(`Response: ${response.status} ${response.statusText}`);
    return response;
  },

  async expectStatus(url: string, expectedStatus: number, options: RequestInit = {}) {
    const response = await this.testEndpoint(url, options);
    assert.equals(response.status, expectedStatus, `Expected status ${expectedStatus} for ${url}`);
    return response;
  },

  async expectJson(url: string, options: RequestInit = {}) {
    const response = await this.testEndpoint(url, options);
    const contentType = response.headers.get('content-type');
    assert.truthy(contentType?.includes('application/json'), 'Expected JSON response');
    return response.json();
  }
};

// WebSocket testing helpers
export const wsTestHelpers = {
  async testConnection(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        devLogger.websocket(`WebSocket connected to ${url}`);
        resolve(ws);
      };
      
      ws.onerror = (error) => {
        devLogger.error(`WebSocket connection failed: ${url}`, error);
        reject(error);
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  },

  async sendAndExpectResponse(ws: WebSocket, message: any, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent) => {
        ws.removeEventListener('message', messageHandler);
        resolve(JSON.parse(event.data));
      };
      
      ws.addEventListener('message', messageHandler);
      ws.send(JSON.stringify(message));
      
      setTimeout(() => {
        ws.removeEventListener('message', messageHandler);
        reject(new Error('WebSocket response timeout'));
      }, timeout);
    });
  }
};

// Database testing helpers
export const dbTestHelpers = {
  generateTestUser: () => ({
    firebaseUid: `test-${Date.now()}-${Math.random()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    interests: ['testing', 'development'],
    onboardingCompleted: true
  }),

  generateTestCommunity: () => ({
    name: `Test Community ${Date.now()}`,
    description: 'A test community for development',
    category: 'test',
    memberCount: 1,
    isActive: true
  }),

  generateTestEvent: () => ({
    title: `Test Event ${Date.now()}`,
    description: 'A test event for development',
    organizer: 'Test Organizer',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    location: 'Test Location',
    address: 'Test Address',
    category: 'test',
    price: 0,
    isGlobal: false
  })
};

// Performance testing helpers
export const performanceTestHelpers = {
  async measureExecutionTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    devLogger.info(`Execution time: ${duration.toFixed(2)}ms`);
    return { result, duration };
  },

  async loadTest(fn: () => Promise<any>, concurrent: number = 10, iterations: number = 100) {
    devLogger.info(`Starting load test: ${concurrent} concurrent, ${iterations} iterations`);
    
    const results = [];
    for (let batch = 0; batch < iterations; batch += concurrent) {
      const promises = [];
      for (let i = 0; i < concurrent && batch + i < iterations; i++) {
        promises.push(this.measureExecutionTime(fn));
      }
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }
    
    const durations = results.map(r => r.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    devLogger.info(`Load test results: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    return { avg, min, max, results };
  }
};

// Create default test runner instance
export const testRunner = new TestRunner();

// Common test suites
export const commonTests = {
  // Register API health checks
  registerApiTests: () => {
    testRunner.addTest('API Health Check', async () => {
      await apiTestHelpers.expectStatus('/api/health', 200);
    });

    testRunner.addTest('Database Connection', async () => {
      await apiTestHelpers.expectStatus('/api/users/1', 200);
    });
  },

  // Register WebSocket tests
  registerWebSocketTests: () => {
    testRunner.addTest('WebSocket Connection', async () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = await wsTestHelpers.testConnection(wsUrl);
      ws.close();
    });
  },

  // Register performance tests
  registerPerformanceTests: () => {
    testRunner.addTest('Component Render Performance', async () => {
      const { duration } = await performanceTestHelpers.measureExecutionTime(() => {
        // Simulate component render
        return new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      });
      
      assert.truthy(duration < 500, 'Component render should be under 500ms');
    });
  }
};

export default testRunner;