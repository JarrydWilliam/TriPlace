import { apiRequest } from "./queryClient";

export type TelemetryEventType = 
  | 'quiz_complete' 
  | 'event_view' 
  | 'external_source_click' 
  | 'rsvp_intent' 
  | 'verification_start' 
  | 'verification_success' 
  | 'verification_failed' 
  | 'rsvp_complete' 
  | 'post_event_review_opened' 
  | 'post_event_review_completed' 
  | 'block_user' 
  | 'report_event' 
  | 'report_user';

export async function trackEvent(
  eventType: TelemetryEventType, 
  data?: { userId?: number, eventId?: number, metadata?: any }
) {
  try {
    // Generate or get session ID from sessionStorage
    let sessionId = sessionStorage.getItem('samevibe_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('samevibe_session_id', sessionId);
    }

    await apiRequest("POST", "/api/telemetry", {
      eventType,
      sessionId,
      userId: data?.userId,
      eventId: data?.eventId,
      metadata: data?.metadata || {}
    });
  } catch (error) {
    // Fail silently in production to not interrupt UX
    console.error('Telemetry error:', error);
  }
}
