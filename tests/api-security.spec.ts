import { test, expect } from '@playwright/test';

test.describe('API Security Audit - SameVibe', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
  let eventId = 1;

  // Setup: Create a test event and grab its ID if needed.
  test.beforeAll(async ({ request }) => {
    // In a real test, we would hit a setup endpoint.
  });

  test('RSVP Registration - Authenticated user registers themselves', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/events/${eventId}/register`, {
      headers: { 'x-mock-user-id': '1' }
    });
    // We expect success or "Already registered" or "Event is at capacity" depending on DB state.
    // If successful, returns 201.
    expect([201, 403, 409]).toContain(res.status());
  });

  test('RSVP Registration - Unauthenticated request', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/events/${eventId}/register`, {
      // No x-mock-user-id or Authorization
    });
    expect(res.status()).toBe(401);
  });

  test('RSVP Cancellation - Ownership bounds', async ({ request }) => {
    // Try to cancel
    const res = await request.delete(`${BASE_URL}/api/events/${eventId}/register`, {
      headers: { 'x-mock-user-id': '1' }
    });
    expect([200, 404]).toContain(res.status());
  });

  test('RSVP Cancellation - Unauthenticated request', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/events/${eventId}/register`);
    expect(res.status()).toBe(401);
  });

  test('Account Deletion - Own account', async ({ request }) => {
    // A mock delete that we expect to fail with 403 if ID doesn't match
    const res = await request.delete(`${BASE_URL}/api/users/99999`, {
      headers: { 'x-mock-user-id': '1' }
    });
    expect(res.status()).toBe(403);
  });

  test('Public Profile Sanitization - Ensure sensitive fields are stripped', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/users/1`);
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).not.toHaveProperty('dateOfBirth');
      expect(data).not.toHaveProperty('firebaseUid');
      expect(data).not.toHaveProperty('termsVersion');
      expect(data).not.toHaveProperty('termsAcceptedAt');
      expect(data).not.toHaveProperty('email');
      expect(data).not.toHaveProperty('trustLevel');
      expect(data).not.toHaveProperty('subscriptionStart');
      expect(data).not.toHaveProperty('subscriptionEnd');
    }
  });

});
