import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { apiRequest } from './queryClient';

export async function registerForPushNotifications(userId: number) {
  // Only try to register on native devices (iOS/Android)
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications skipped: Not a native platform');
    return false;
  }

  try {
    // 1. Request permissions
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    
    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission denied');
      return false;
    }

    // 2. Register for push (this asks OS for FCM/APNS token)
    await PushNotifications.register();

    // 3. Listen for registration success
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      // Optional: Send this token to backend if backend manages FCM directly.
      // E.g. await apiRequest("POST", `/api/users/${userId}/push-token`, { token: token.value });
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on push registration:', error);
    });

    // 4. Listen for incoming notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
      // Fire generic event to update UI if needed
      window.dispatchEvent(new CustomEvent('app-notification', { detail: notification }));
    });

    // 5. Listen for notification clicks
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action performed:', action);
      const data = action.notification.data;
      if (data && data.url) {
        // Simple routing inside the app
        window.location.href = data.url;
      }
    });

    return true;
  } catch (error) {
    console.error('Push notification setup failed:', error);
    return false;
  }
}
