import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Alert, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  
  // Your deployed web app URL - update this with your actual deployment URL
  const WEB_APP_URL = 'https://your-triplace-app.replit.app';
  
  let webViewRef = null;

  useEffect(() => {
    // Hide splash screen after component mounts
    const hideSplashScreen = async () => {
      await SplashScreen.hideAsync();
    };
    
    if (!isLoading) {
      hideSplashScreen();
    }
  }, [isLoading]);

  useEffect(() => {
    // Handle Android back button
    const backAction = () => {
      if (canGoBack && webViewRef) {
        webViewRef.goBack();
        return true; // Prevent default behavior
      }
      return false; // Allow default behavior (exit app)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error: ', nativeEvent);
    
    Alert.alert(
      'Connection Error',
      'Unable to load TriPlace. Please check your internet connection and try again.',
      [
        { text: 'Retry', onPress: () => webViewRef?.reload() }
      ]
    );
  };

  const injectedJavaScript = `
    // Enhanced mobile-first optimizations for native app feel
    (function() {
      // Add mobile app indicator
      window.isMobileApp = true;
      
      // Inject comprehensive mobile-first CSS
      const mobileCSS = \`
        /* Mobile-first base styles - prevent horizontal scroll */
        html, body {
          overflow-x: hidden !important;
          overflow-y: auto !important;
          width: 100% !important;
          -webkit-overflow-scrolling: touch !important;
          scroll-behavior: smooth !important;
        }
        
        /* Remove all tap highlights and enhance touch */
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          box-sizing: border-box !important;
        }
        
        /* Allow text selection in content areas */
        input, textarea, [contenteditable], p, span {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
        
        /* Touch-friendly minimum 44px targets */
        button, [role="button"], input, textarea, select, a {
          min-height: 44px !important;
          min-width: 44px !important;
          touch-action: manipulation !important;
          padding: 12px 16px !important;
        }
        
        /* Remove hover effects on touch devices */
        @media (hover: none) and (pointer: coarse) {
          *:hover {
            background-color: inherit !important;
            transform: none !important;
            scale: none !important;
          }
          
          /* Enhanced mobile text sizes */
          .text-sm { font-size: 1rem !important; }
          .text-base { font-size: 1.125rem !important; }
          .text-lg { font-size: 1.25rem !important; }
        }
        
        /* Fix double scrollbars and viewport issues */
        body {
          overflow: hidden !important;
        }
        
        #root {
          overflow-y: auto !important;
          height: 100vh !important;
          height: 100dvh !important;
        }
        
        /* Enhanced mobile containers */
        .container {
          max-width: 100% !important;
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        
        /* Mobile-optimized cards and buttons */
        .community-card, .event-card, [class*="card"] {
          padding: 1rem !important;
          margin-bottom: 0.75rem !important;
          border-radius: 0.75rem !important;
        }
        
        /* Larger mobile buttons with better spacing */
        .btn, .button, button {
          padding: 0.875rem 1.25rem !important;
          font-size: 1rem !important;
          border-radius: 0.5rem !important;
          font-weight: 500 !important;
        }
        
        /* Enhanced mobile forms */
        input, textarea, select {
          font-size: 16px !important; /* Prevents zoom on iOS */
          padding: 0.75rem !important;
          border-radius: 0.5rem !important;
        }
        
        /* Mobile navigation improvements */
        .mobile-nav, .sidebar {
          touch-action: pan-y !important;
        }
        
        /* Safe area adjustments for notched devices */
        @supports (padding: max(0px)) {
          .safe-area-top {
            padding-top: max(44px, env(safe-area-inset-top)) !important;
          }
          .safe-area-bottom {
            padding-bottom: max(20px, env(safe-area-inset-bottom)) !important;
          }
        }
      \`;
      
      // Inject the CSS
      const styleSheet = document.createElement('style');
      styleSheet.textContent = mobileCSS;
      document.head.appendChild(styleSheet);
      
      // Disable zoom and enhance viewport
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
      
      // Enhanced touch feedback
      let touchFeedbackStyle = null;
      
      document.addEventListener('touchstart', function(e) {
        if (e.target.matches('button, [role="button"], a, .card')) {
          if (!touchFeedbackStyle) {
            touchFeedbackStyle = document.createElement('style');
            document.head.appendChild(touchFeedbackStyle);
          }
          touchFeedbackStyle.textContent = \`
            .touch-active {
              opacity: 0.7 !important;
              transform: scale(0.98) !important;
              transition: all 0.1s ease !important;
            }
          \`;
          e.target.classList.add('touch-active');
        }
      });
      
      document.addEventListener('touchend', function(e) {
        if (e.target.matches('button, [role="button"], a, .card')) {
          setTimeout(() => {
            e.target.classList.remove('touch-active');
          }, 150);
        }
      });
      
      // Prevent accidental zoom on double-tap
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function(e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
      
      // Enhanced mobile scrolling
      document.documentElement.style.scrollBehavior = 'smooth';
      
      // Add safe area padding for modern devices
      if (window.screen.height > 800) {
        document.body.style.paddingTop = 'env(safe-area-inset-top)';
        document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
      }
      
      // Signal optimization completion
      console.log('TriPlace mobile optimizations applied successfully');
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        ref={(ref) => (webViewRef = ref)}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onNavigationStateChange={handleNavigationStateChange}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={true}
        allowsBackForwardNavigationGestures={true}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        userAgent="TriPlace-Mobile/1.0"
        pullToRefreshEnabled={true}
        onContentProcessDidTerminate={() => webViewRef?.reload()}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            {/* Loading will be handled by splash screen */}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});