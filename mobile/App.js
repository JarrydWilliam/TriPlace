import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function App() {
  const [webViewUrl, setWebViewUrl] = useState('');
  
  useEffect(() => {
    // Dynamic URL configuration - update this with your actual deployment URL
    // For development: use your Replit development URL
    // For production: use your deployed Replit app URL
    const replitUrl = 'https://your-replit-app.repl.co'; // Replace with your actual URL
    setWebViewUrl(replitUrl);
    
    // Request location permissions on app startup
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'TriPlace needs location access to find communities and events near you.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle location requests from web app
      if (data.type === 'REQUEST_LOCATION') {
        getCurrentLocation();
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
          maximumAge: 60000, // 1 minute cache
        });
        
        // Send location back to web app
        const locationData = {
          type: 'LOCATION_RESPONSE',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        };
        
        webViewRef.current?.postMessage(JSON.stringify(locationData));
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const webViewRef = React.useRef();

  const injectedJavaScript = `
    // Override geolocation to use native location
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      // Request location from native app
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'REQUEST_LOCATION'
      }));
      
      // Store callback for when native responds
      window.pendingLocationCallback = success;
    };

    // Listen for location responses from native
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LOCATION_RESPONSE' && window.pendingLocationCallback) {
          window.pendingLocationCallback({
            coords: {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: data.accuracy
            },
            timestamp: Date.now()
          });
          window.pendingLocationCallback = null;
        }
      } catch (e) {
        console.log('Message handling error:', e);
      }
    });

    // Remove desktop-specific styles and parameters
    const style = document.createElement('style');
    style.textContent = \`
      /* Remove desktop-specific constraints */
      .desktop-only { display: none !important; }
      
      /* Full mobile viewport */
      html, body {
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
      }
      
      /* Mobile-optimized containers */
      .container, .max-w-7xl, .max-w-6xl, .max-w-5xl {
        max-width: 100% !important;
        width: 100% !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
      
      /* Remove fixed desktop widths */
      .w-64, .w-80, .w-96 {
        width: auto !important;
      }
      
      /* Mobile navigation adjustments */
      .hidden.lg\\:block {
        display: block !important;
      }
      
      .lg\\:hidden {
        display: none !important;
      }
      
      /* Touch-friendly sizing */
      button, .btn {
        min-height: 44px !important;
        min-width: 44px !important;
      }

      /* Remove hover effects on mobile */
      @media (hover: none) {
        *:hover {
          background-color: inherit !important;
          color: inherit !important;
        }
      }
    \`;
    document.head.appendChild(style);
    
    true; // Required for injected JS
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
    backgroundColor: '#f59e0b', // TriPlace brand color
    paddingTop: Constants.statusBarHeight,
  },
  webview: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
});