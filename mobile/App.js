import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Dimensions, AppState, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// Configure notifications for TriPlace community updates
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function App() {
  const [webViewUrl, setWebViewUrl] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);
  const [notificationToken, setNotificationToken] = useState('');
  const webViewRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();
  
  useEffect(() => {
    initializeTriPlaceApp();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      handleNotificationReceived(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });

    return () => {
      subscription?.remove();
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const initializeTriPlaceApp = async () => {
    const replitUrl = 'https://TriPlaceApp.replit.app';
    setWebViewUrl(replitUrl);
    
    await requestLocationPermission();
    await registerForPushNotifications();
    await setupSecureStorage();
    configureDeepLinking();
  };

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'TriPlace needs location access to find communities and events near you.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  };

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setNotificationToken(token);
      
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'PUSH_TOKEN',
          token: token
        }));
      }
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  };

  const setupSecureStorage = async () => {
    try {
      await SecureStore.setItemAsync('triplace_mobile_init', 'true');
    } catch (error) {
      console.log('Secure storage setup error:', error);
    }
  };

  const configureDeepLinking = () => {
    const handleDeepLink = (url) => {
      if (webViewRef.current && url) {
        const parsedUrl = Linking.parse(url);
        if (parsedUrl.hostname === 'triplace' || parsedUrl.hostname === 'TriPlaceApp.replit.app') {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'DEEP_LINK',
            url: parsedUrl.path
          }));
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(handleDeepLink);
    return subscription;
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      getCurrentLocation();
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'APP_FOREGROUND',
          timestamp: Date.now()
        }));
      }
    }
    setAppState(nextAppState);
  };

  const handleNotificationReceived = (notification) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'NOTIFICATION_RECEIVED',
        notification: notification.request.content
      }));
    }
  };

  const handleNotificationResponse = (response) => {
    const notificationData = response.notification.request.content.data;
    if (webViewRef.current && notificationData) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'NOTIFICATION_TAPPED',
        data: notificationData
      }));
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'REQUEST_LOCATION':
          getCurrentLocation();
          break;
        case 'OPEN_EXTERNAL_LINK':
          WebBrowser.openBrowserAsync(data.url);
          break;
        case 'SHARE_CONTENT':
          handleShareContent(data);
          break;
        case 'STORE_SECURE_DATA':
          SecureStore.setItemAsync(data.key, data.value);
          break;
        case 'GET_SECURE_DATA':
          handleGetSecureData(data.key);
          break;
        case 'SEND_NOTIFICATION':
          scheduleNotification(data);
          break;
        case 'AUTH_ERROR':
          Alert.alert('Authentication Error', data.message);
          break;
        case 'PWA_PROMPT_DISMISSED':
          // PWA prompts are handled natively, no action needed
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.log('Message parsing error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 60000,
        });
        
        const locationData = {
          type: 'LOCATION_RESPONSE',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
          timestamp: location.timestamp
        };
        
        webViewRef.current?.postMessage(JSON.stringify(locationData));
      }
    } catch (error) {
      console.error('Location error:', error);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'LOCATION_ERROR',
        error: error.message
      }));
    }
  };

  const handleShareContent = async (data) => {
    try {
      const shareUrl = `https://TriPlaceApp.replit.app${data.path || ''}`;
      await WebBrowser.openBrowserAsync(shareUrl);
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleGetSecureData = async (key) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'SECURE_DATA_RESPONSE',
        key: key,
        value: value
      }));
    } catch (error) {
      console.log('Secure storage get error:', error);
    }
  };

  const scheduleNotification = async (data) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.payload,
        },
        trigger: data.trigger || { seconds: 1 },
      });
    } catch (error) {
      console.log('Notification scheduling error:', error);
    }
  };

  const injectedJavaScript = `
    // Enhanced mobile integration for TriPlace features
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'REQUEST_LOCATION'
      }));
      window.pendingLocationCallback = success;
    };

    // Enhanced message handling for TriPlace functionality
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'LOCATION_RESPONSE':
            if (window.pendingLocationCallback) {
              window.pendingLocationCallback({
                coords: {
                  latitude: data.latitude,
                  longitude: data.longitude,
                  accuracy: data.accuracy,
                  altitude: data.altitude,
                  heading: data.heading,
                  speed: data.speed
                },
                timestamp: data.timestamp
              });
              window.pendingLocationCallback = null;
            }
            break;
          case 'PUSH_TOKEN':
            window.localStorage.setItem('expo_push_token', data.token);
            break;
          case 'APP_FOREGROUND':
            window.dispatchEvent(new CustomEvent('app-foreground'));
            break;
          case 'NOTIFICATION_RECEIVED':
            window.dispatchEvent(new CustomEvent('notification-received', { detail: data.notification }));
            break;
          case 'DEEP_LINK':
            if (window.history && data.url) {
              window.history.pushState({}, '', data.url);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
            break;
        }
      } catch (e) {
        console.log('Message handling error:', e);
      }
    });

    // Enhanced Firebase authentication for mobile WebView
    window.addEventListener('DOMContentLoaded', function() {
      // Override Firebase popup authentication for mobile
      if (window.firebase && window.firebase.auth) {
        const auth = window.firebase.auth();
        const originalSignInWithPopup = auth.signInWithPopup;
        
        if (originalSignInWithPopup) {
          auth.signInWithPopup = function(provider) {
            // Enhanced mobile configuration
            provider.setCustomParameters({
              prompt: 'select_account',
              display: 'touch'
            });
            
            // Add mobile-specific scopes
            if (provider.providerId === 'google.com') {
              provider.addScope('email');
              provider.addScope('profile');
            }
            
            return originalSignInWithPopup.call(this, provider)
              .then(function(result) {
                console.log('Mobile auth success:', result.user.email);
                return result;
              })
              .catch(function(error) {
                console.error('Mobile auth error:', error);
                
                // Enhanced error handling for mobile
                switch (error.code) {
                  case 'auth/popup-blocked':
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'AUTH_ERROR',
                      message: 'Sign-in popup was blocked. Please allow popups and try again.'
                    }));
                    break;
                  case 'auth/popup-closed-by-user':
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'AUTH_ERROR', 
                      message: 'Sign-in was cancelled. Please try again.'
                    }));
                    break;
                  case 'auth/network-request-failed':
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'AUTH_ERROR',
                      message: 'Network error. Please check your connection and try again.'
                    }));
                    break;
                  default:
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'AUTH_ERROR',
                      message: 'Authentication failed: ' + error.message
                    }));
                }
                throw error;
              });
          };
        }
      }
      
      // Disable PWA installation prompts completely in mobile app
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Override any PWA prompt functions and global variables
      if (window.localStorage) {
        window.localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        window.localStorage.setItem('pwa-installed', 'true');
        window.localStorage.setItem('mobile-app', 'true');
      }
      
      // Force remove PWA prompts every 100ms
      const removePWAElements = function() {
        const selectors = [
          '[data-pwa-prompt]',
          '.pwa-install-dialog',
          '.global-pwa-prompt',
          '[role="dialog"][aria-label*="install"]',
          '[role="dialog"][aria-label*="PWA"]',
          '.install-prompt',
          '.add-to-home-screen',
          'button[aria-label*="install"]',
          'button[aria-label*="add to home"]',
          '[data-testid*="pwa"]',
          '[data-testid*="install"]'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            el.remove();
          });
        });
      };
      
      // Run immediately and then every 100ms
      removePWAElements();
      setInterval(removePWAElements, 100);
      
      // Override global PWA functions
      window.showInstallPrompt = function() { return false; };
      window.installApp = function() { return false; };
      window.promptToInstall = function() { return false; };
    });

    // Mobile-optimized CSS injection
    const style = document.createElement('style');
    style.textContent = \`
      .desktop-only { display: none !important; }
      
      html, body {
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
      }
      
      .container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
        max-width: 100% !important;
        width: 100% !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
      
      .w-64, .w-80, .w-96 {
        width: auto !important;
      }
      
      button, .btn, [role="button"], input, select, textarea {
        min-height: 44px !important;
        min-width: 44px !important;
        touch-action: manipulation;
      }

      @media (hover: none) and (pointer: coarse) {
        *:hover {
          background-color: inherit !important;
          color: inherit !important;
          transform: none !important;
        }
      }

      /* Completely hide PWA install prompts and dialogs */
      [data-pwa-prompt], 
      .pwa-install-dialog,
      .global-pwa-prompt,
      [role="dialog"][aria-label*="install"],
      [role="dialog"][aria-label*="PWA"],
      .install-prompt,
      .add-to-home-screen,
      button[aria-label*="install"],
      button[aria-label*="add to home"],
      [data-testid*="pwa"],
      [data-testid*="install"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        pointer-events: none !important;
        z-index: -1 !important;
      }

      /* Enhanced mobile navigation */
      .lg\\:hidden {
        display: block !important;
      }
      
      .hidden.lg\\:block {
        display: none !important;
      }

      /* Ensure proper popup z-index for authentication */
      .firebase-auth-container,
      [data-auth-popup],
      .google-auth-popup,
      iframe[src*="accounts.google.com"] {
        z-index: 999999 !important;
        position: fixed !important;
      }

      /* Mobile-optimized form inputs to prevent zoom */
      input[type="email"],
      input[type="password"], 
      input[type="text"] {
        font-size: 16px !important;
        -webkit-appearance: none !important;
        border-radius: 8px !important;
      }

      /* Force remove any remaining PWA elements */
      *[class*="pwa" i], 
      *[class*="install" i],
      *[id*="pwa" i],
      *[id*="install" i] {
        display: none !important;
      }
    \`;
    document.head.appendChild(style);
    
    true;
  `;

  if (!webViewUrl) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        ref={webViewRef}
        source={{ uri: webViewUrl }}
        style={styles.webview}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={true}
        allowsBackForwardNavigationGestures={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        allowsProtectedMedia={true}
        javaScriptCanOpenWindowsAutomatically={true}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        onShouldStartLoadWithRequest={(request) => {
          // Handle authentication redirects and popups
          if (request.url.includes('accounts.google.com') || 
              request.url.includes('firebase') ||
              request.url.includes('googleapis.com')) {
            return true; // Allow Firebase/Google auth
          }
          
          // Block external navigation that isn't auth-related
          if (!request.url.includes('TriPlaceApp.replit.app') && 
              !request.url.includes('accounts.google.com') &&
              !request.url.includes('firebase') &&
              !request.url.includes('googleapis.com')) {
            WebBrowser.openBrowserAsync(request.url);
            return false;
          }
          
          return true;
        }}
        onNavigationStateChange={(navState) => {
          // Handle navigation changes for proper auth flow
          if (navState.url.includes('accounts.google.com')) {
            console.log('Google auth navigation detected');
          }
        }}
        onError={(error) => {
          console.error('WebView Error:', error);
          Alert.alert('Connection Error', 'Unable to load TriPlace. Please check your internet connection.');
        }}
        onHttpError={(error) => {
          console.error('HTTP Error:', error);
        }}
        onLoadStart={() => {
          console.log('TriPlace loading...');
        }}
        onLoadEnd={() => {
          console.log('TriPlace loaded successfully');
          // Send mobile app initialization data
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'MOBILE_APP_READY',
            deviceInfo: {
              platform: Platform.OS,
              deviceName: Device.deviceName,
              modelName: Device.modelName,
              osVersion: Device.osVersion,
              pushToken: notificationToken
            }
          }));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingTop: Constants.statusBarHeight,
  },
  webview: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
});