import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TRIPLACE_URL = 'https://TriPlaceApp.replit.app';

export default function App() {
  const [location, setLocation] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const webViewRef = useRef(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    initializeApp();
    setupNotifications();
    
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 300000, // 5 minutes
        });
        setLocation(currentLocation);
      }

      // Setup deep linking
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }

      Linking.addEventListener('url', handleDeepLink);
      
      setIsReady(true);
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to initialize app features');
      setIsReady(true); // Still allow app to load
    }
  };

  const setupNotifications = async () => {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Notifications', 'Push notifications are disabled. Enable them in settings for the best experience.');
      return;
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Send token to web app
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'SET_PUSH_TOKEN',
        token: token
      }));
    }

    // Configure notification channel for Android
    if (Device.osName === 'Android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const data = response.notification.request.content.data;
      
      if (data.url && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'NAVIGATE_TO',
          url: data.url
        }));
      }
    });
  };

  const handleDeepLink = (url) => {
    console.log('Deep link received:', url);
    if (webViewRef.current && url.startsWith('triplace://')) {
      const path = url.replace('triplace://', '');
      webViewRef.current.postMessage(JSON.stringify({
        type: 'DEEP_LINK',
        path: path
      }));
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'REQUEST_LOCATION':
          handleLocationRequest();
          break;
        case 'STORE_SECURE_DATA':
          handleSecureStorage(data.key, data.value);
          break;
        case 'GET_SECURE_DATA':
          handleGetSecureData(data.key);
          break;
        case 'SEND_NOTIFICATION':
          scheduleNotification(data);
          break;
        case 'OPEN_EXTERNAL_URL':
          WebBrowser.openBrowserAsync(data.url);
          break;
        case 'SHARE_CONTENT':
          handleShare(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  };

  const handleLocationRequest = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'LOCATION_ERROR',
          error: 'Location permission denied'
        }));
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 60000, // 1 minute
      });

      webViewRef.current?.postMessage(JSON.stringify({
        type: 'LOCATION_UPDATE',
        location: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy
        }
      }));
      
      setLocation(currentLocation);
    } catch (error) {
      console.error('Location error:', error);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'LOCATION_ERROR',
        error: error.message
      }));
    }
  };

  const handleSecureStorage = async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'SECURE_STORE_SUCCESS',
        key: key
      }));
    } catch (error) {
      console.error('Secure storage error:', error);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'SECURE_STORE_ERROR',
        key: key,
        error: error.message
      }));
    }
  };

  const handleGetSecureData = async (key) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'SECURE_DATA_RESPONSE',
        key: key,
        value: value ? JSON.parse(value) : null
      }));
    } catch (error) {
      console.error('Secure data retrieval error:', error);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'SECURE_DATA_ERROR',
        key: key,
        error: error.message
      }));
    }
  };

  const scheduleNotification = async (data) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
        },
        trigger: data.delay ? { seconds: data.delay } : null,
      });
    } catch (error) {
      console.error('Notification scheduling error:', error);
    }
  };

  const handleShare = async (data) => {
    try {
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const injectedJavaScript = `
    // Enhanced mobile app environment setup
    window.isNativeMobileApp = true;
    window.ReactNativeWebView = true;
    
    // Mobile-specific localStorage flags
    if (window.localStorage) {
      window.localStorage.setItem('mobile-app', 'true');
      window.localStorage.setItem('pwa-installed', 'true');
      window.localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }

    // Enhanced mobile CSS injection
    const style = document.createElement('style');
    style.textContent = \`
      /* Remove all PWA prompts in mobile app */
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
        pointer-events: none !important;
      }

      /* Mobile-optimized layout */
      html, body {
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
      }
      
      .container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
        max-width: 100% !important;
        width: 100% !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
      
      /* Enhanced touch targets */
      button, .btn, [role="button"], input, select, textarea {
        min-height: 44px !important;
        min-width: 44px !important;
        touch-action: manipulation !important;
      }

      /* Disable hover effects on mobile */
      @media (hover: none) and (pointer: coarse) {
        *:hover {
          background-color: inherit !important;
          color: inherit !important;
          transform: none !important;
        }
      }

      /* Mobile navigation enhancements */
      .lg\\:hidden {
        display: block !important;
      }
      
      .hidden.lg\\:block {
        display: none !important;
      }

      /* Mobile-optimized forms */
      input[type="email"],
      input[type="password"], 
      input[type="text"] {
        font-size: 16px !important;
        -webkit-appearance: none !important;
        border-radius: 8px !important;
      }

      /* Safe area handling */
      .app-container {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
    \`;
    document.head.appendChild(style);

    // Disable PWA install prompts
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      return false;
    });

    // Enhanced Firebase authentication for mobile
    window.addEventListener('DOMContentLoaded', function() {
      if (window.firebase && window.firebase.auth) {
        const auth = window.firebase.auth();
        const originalSignInWithPopup = auth.signInWithPopup;
        
        if (originalSignInWithPopup) {
          auth.signInWithPopup = function(provider) {
            provider.setCustomParameters({
              prompt: 'select_account',
              display: 'touch'
            });
            
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
                
                let message = 'Authentication failed. Please try again.';
                switch (error.code) {
                  case 'auth/popup-blocked':
                    message = 'Sign-in popup was blocked. Please allow popups and try again.';
                    break;
                  case 'auth/popup-closed-by-user':
                    message = 'Sign-in was cancelled. Please try again.';
                    break;
                  case 'auth/network-request-failed':
                    message = 'Network error. Please check your connection and try again.';
                    break;
                }
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'AUTH_ERROR',
                  message: message
                }));
                
                throw error;
              });
          };
        }
      }
    });

    // Location services integration
    if (navigator.geolocation) {
      const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'REQUEST_LOCATION'
        }));
        
        // Use native location if available
        const handleLocationMessage = function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'LOCATION_UPDATE') {
              success({
                coords: {
                  latitude: data.location.latitude,
                  longitude: data.location.longitude,
                  accuracy: data.location.accuracy
                },
                timestamp: Date.now()
              });
              window.removeEventListener('message', handleLocationMessage);
            } else if (data.type === 'LOCATION_ERROR') {
              error({ code: 1, message: data.error });
              window.removeEventListener('message', handleLocationMessage);
            }
          } catch (e) {
            // Fallback to original implementation
            originalGetCurrentPosition.call(navigator.geolocation, success, error, options);
            window.removeEventListener('message', handleLocationMessage);
          }
        };
        
        window.addEventListener('message', handleLocationMessage);
        
        // Fallback timeout
        setTimeout(() => {
          window.removeEventListener('message', handleLocationMessage);
          originalGetCurrentPosition.call(navigator.geolocation, success, error, options);
        }, 5000);
      };
    }

    true; // Required for injection
  `;

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading TriPlace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="auto" backgroundColor="#ffffff" />
      <WebView
        ref={webViewRef}
        source={{ uri: TRIPLACE_URL }}
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
          // Handle authentication redirects
          if (request.url.includes('accounts.google.com') || 
              request.url.includes('firebase') ||
              request.url.includes('googleapis.com')) {
            return true;
          }
          
          // Block external navigation
          if (!request.url.includes('TriPlaceApp.replit.app') && 
              !request.url.includes('accounts.google.com') &&
              !request.url.includes('firebase') &&
              !request.url.includes('googleapis.com')) {
            WebBrowser.openBrowserAsync(request.url);
            return false;
          }
          
          return true;
        }}
        onError={(error) => {
          console.error('WebView Error:', error);
          Alert.alert('Connection Error', 'Unable to load TriPlace. Please check your internet connection.');
        }}
        onHttpError={(error) => {
          console.error('HTTP Error:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
});