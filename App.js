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
    // Inject mobile-specific styles and behaviors
    (function() {
      // Add mobile app indicator
      window.isMobileApp = true;
      
      // Enhance touch interactions
      document.body.style.webkitTouchCallout = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      // Disable zoom
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
      
      // Add safe area padding for notched devices
      if (window.innerHeight > 800) {
        document.body.style.paddingTop = '44px';
        document.body.style.paddingBottom = '34px';
      }
    })();
    true; // Note: this is required, or you'll sometimes get silent failures
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