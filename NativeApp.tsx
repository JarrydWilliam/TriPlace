import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Geolocation from 'react-native-geolocation-service';

const { width, height } = Dimensions.get('window');

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  location?: string;
}

interface Community {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  image?: string;
}

// Native React Native App Component
export default function NativeTriPlaceApp() {
  const [user, setUser] = useState<User | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Configure Google Sign In
      GoogleSignin.configure({
        webClientId: 'your-firebase-web-client-id',
      });

      // Check for cached user
      const cachedUser = await AsyncStorage.getItem('user');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }

      // Get location (native API access)
      getCurrentLocation();
      
      // Load communities from cache first, then fetch fresh data
      const cachedCommunities = await AsyncStorage.getItem('communities');
      if (cachedCommunities) {
        setCommunities(JSON.parse(cachedCommunities));
      }
      
      fetchCommunities();
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
      },
      (error) => {
        console.log('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Call your backend API
      const response = await fetch('https://your-app.replit.app/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: userInfo.idToken,
          location: location 
        }),
      });
      
      const userData = await response.json();
      setUser(userData);
      
      // Cache user data for instant app startup
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      Alert.alert('Sign In Error', 'Unable to sign in. Please try again.');
    }
  };

  const fetchCommunities = async () => {
    try {
      const response = await fetch('https://your-app.replit.app/api/communities', {
        headers: {
          'Authorization': `Bearer ${user?.id}`,
          'User-Location': location ? `${location.lat},${location.lon}` : '',
        },
      });
      
      const communityData = await response.json();
      setCommunities(communityData);
      
      // Cache for offline access
      await AsyncStorage.setItem('communities', JSON.stringify(communityData));
    } catch (error) {
      console.error('Failed to fetch communities:', error);
    }
  };

  const joinCommunity = async (communityId: number) => {
    try {
      const response = await fetch(`https://your-app.replit.app/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Joined community successfully!');
        fetchCommunities(); // Refresh data
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join community');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading TriPlace...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.welcomeTitle}>Welcome to TriPlace</Text>
        <Text style={styles.welcomeSubtitle}>Your Digital Third Place</Text>
        
        <TouchableOpacity style={styles.googleButton} onPress={signInWithGoogle}>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
      </View>

      {/* Communities List - Native ScrollView (60fps performance) */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        decelerationRate="fast"
      >
        {communities.map((community) => (
          <TouchableOpacity
            key={community.id}
            style={styles.communityCard}
            onPress={() => joinCommunity(community.id)}
            activeOpacity={0.8}
          >
            <View style={styles.communityContent}>
              <Text style={styles.communityName}>{community.name}</Text>
              <Text style={styles.communityDescription} numberOfLines={2}>
                {community.description}
              </Text>
              <View style={styles.communityMeta}>
                <Text style={styles.memberCount}>{community.memberCount} members</Text>
                <Text style={styles.category}>{community.category}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 48,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60, // Safe area
    backgroundColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  communityCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  communityContent: {
    flex: 1,
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  communityDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 12,
    lineHeight: 20,
  },
  communityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  category: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '500',
  },
});