/**
 * Mock API Utilities for Development
 * Provides mock responses and test endpoints for development testing
 */

import { devLogger } from './debug';

export interface MockApiResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  delay?: number;
}

export class MockAPIHandler {
  private static instance: MockAPIHandler;
  private mockResponses: Map<string, MockApiResponse> = new Map();
  private enabled: boolean = false;

  private constructor() {}

  static getInstance(): MockAPIHandler {
    if (!MockAPIHandler.instance) {
      MockAPIHandler.instance = new MockAPIHandler();
    }
    return MockAPIHandler.instance;
  }

  enable() {
    this.enabled = true;
    devLogger.info('Mock API enabled');
  }

  disable() {
    this.enabled = false;
    devLogger.info('Mock API disabled');
  }

  setMockResponse(endpoint: string, response: MockApiResponse) {
    this.mockResponses.set(endpoint, response);
    devLogger.info(`Mock response set for ${endpoint}`);
  }

  async handleRequest(endpoint: string, method: string = 'GET'): Promise<MockApiResponse | null> {
    if (!this.enabled) return null;

    const key = `${method.toUpperCase()} ${endpoint}`;
    const mockResponse = this.mockResponses.get(key) || this.mockResponses.get(endpoint);

    if (mockResponse) {
      devLogger.api(`Mock API response for ${key}`, mockResponse.data);
      
      // Simulate network delay if specified
      if (mockResponse.delay) {
        await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
      }

      return mockResponse;
    }

    return null;
  }

  // Predefined mock responses for common endpoints
  setupDefaultMocks() {
    // User authentication
    this.setMockResponse('/api/auth/me', {
      data: {
        id: 1,
        firebaseUid: 'dev-mock-user',
        email: 'dev@example.com',
        name: 'Development User',
        avatar: null,
        onboardingCompleted: true
      },
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Communities list
    this.setMockResponse('/api/communities/recommended', {
      data: [
        {
          id: 1,
          name: 'Tech Innovation Hub',
          description: 'Connect with developers and tech enthusiasts',
          category: 'tech',
          memberCount: 42,
          isActive: true
        },
        {
          id: 2,
          name: 'Creative Arts Circle',
          description: 'Artists and creative minds sharing inspiration',
          category: 'arts',
          memberCount: 28,
          isActive: true
        }
      ],
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // User communities
    this.setMockResponse('/api/users/1/communities', {
      data: [
        {
          id: 1,
          name: 'Tech Innovation Hub',
          description: 'Connect with developers and tech enthusiasts',
          category: 'tech',
          memberCount: 42,
          activityScore: 85,
          lastActivityAt: new Date().toISOString()
        }
      ],
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Events
    this.setMockResponse('/api/events/upcoming', {
      data: [
        {
          id: 1,
          title: 'AI & Machine Learning Workshop',
          description: 'Hands-on workshop covering AI fundamentals',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'TechSpace SF',
          category: 'tech',
          price: 25
        }
      ],
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // WebSocket connection mock
    this.setMockResponse('/ws', {
      data: { connected: true, activeUsers: 5 },
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    devLogger.success('Default mock responses configured');
  }

  // Error simulation
  simulateError(endpoint: string, errorCode: number = 500, message: string = 'Internal Server Error') {
    this.setMockResponse(endpoint, {
      data: { error: message },
      status: errorCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Network delay simulation
  simulateSlowResponse(endpoint: string, delay: number = 2000) {
    const existing = this.mockResponses.get(endpoint);
    if (existing) {
      existing.delay = delay;
    }
  }

  // Get all registered mocks
  listMocks(): string[] {
    return Array.from(this.mockResponses.keys());
  }

  clearMocks() {
    this.mockResponses.clear();
    devLogger.info('All mock responses cleared');
  }
}

// Development utilities for testing
export const mockApi = MockAPIHandler.getInstance();

// Convenience functions for common scenarios
export const devMockUtils = {
  // Enable mock mode with default responses
  enableWithDefaults: () => {
    mockApi.enable();
    mockApi.setupDefaultMocks();
  },

  // Simulate authentication failure
  simulateAuthFailure: () => {
    mockApi.simulateError('/api/auth/me', 401, 'Unauthorized');
  },

  // Simulate network issues
  simulateNetworkIssues: () => {
    mockApi.simulateSlowResponse('/api/communities/recommended', 5000);
    mockApi.simulateError('/api/events/upcoming', 503, 'Service Unavailable');
  },

  // Reset to normal responses
  reset: () => {
    mockApi.clearMocks();
    mockApi.setupDefaultMocks();
  }
};

// Export for use in development components
export default mockApi;