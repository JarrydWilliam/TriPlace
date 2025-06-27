import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';

const TRIPLACE_URL = 'https://your-replit-url.repl.co'; // Replace with actual Replit URL

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleMessage = (event: WebViewMessageEvent) => {
    // Handle messages from the web app if needed
    const { data } = event.nativeEvent;
    try {
      const message = JSON.parse(data);
      console.log('Message from WebView:', message);
    } catch (error) {
      console.log('Raw message from WebView:', data);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    Alert.alert(
      'Connection Error',
      'Unable to load TriPlace. Please check your internet connection and try again.',
      [{ text: 'Retry', onPress: () => webViewRef.current?.reload() }]
    );
  };

  const injectedJavaScript = `
    // Add mobile-specific CSS and JavaScript
    (function() {
      // Add viewport meta tag for proper mobile scaling
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
      }

      // Add mobile-specific styles
      const style = document.createElement('style');
      style.textContent = \`
        body {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior: none;
          overflow-x: hidden;
        }
        
        * {
          -webkit-overflow-scrolling: touch;
        }
        
        /* Enhanced touch targets for mobile */
        button, [role="button"], .clickable {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Mobile-optimized form inputs */
        input, textarea, select {
          font-size: 16px; /* Prevents zoom on iOS */
        }
        
        /* Mobile-friendly scrollbars */
        ::-webkit-scrollbar {
          width: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
        }
      \`;
      document.head.appendChild(style);

      // Send ready message to React Native
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'webview-ready',
        timestamp: Date.now()
      }));
    })();
    
    true; // Required for injected JavaScript
  `;

  if (hasError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>
            Unable to connect to TriPlace. Please check your internet connection.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading TriPlace...</Text>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: TRIPLACE_URL }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={true}
        allowsBackForwardNavigationGestures={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        mixedContentMode="compatibility"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        userAgent="TriPlace-Mobile/1.0 (React Native WebView)"
      />
    </SafeAreaView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});