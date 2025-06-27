import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LocationProvider } from './src/contexts/LocationContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CommunitiesScreen from './src/screens/CommunitiesScreen';
import CommunityDetailScreen from './src/screens/CommunityDetailScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Dashboard') {
            iconName = 'home';
          } else if (route.name === 'Communities') {
            iconName = 'groups';
          } else if (route.name === 'Messages') {
            iconName = 'chat';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Communities" component={CommunitiesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        user.hasCompletedOnboarding ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider>
          <ThemeProvider>
            <AuthProvider>
              <LocationProvider>
                <NavigationContainer>
                  <StatusBar style="auto" />
                  <AppNavigator />
                </NavigationContainer>
              </LocationProvider>
            </AuthProvider>
          </ThemeProvider>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}