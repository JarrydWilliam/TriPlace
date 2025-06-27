import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';

interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  isJoined: boolean;
}

interface Event {
  id: string;
  title: string;
  date: Date;
  location: string;
  communityName: string;
}

export default function DashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { location, getCurrentLocation } = useLocation();
  const { colors } = useTheme();

  const { data: communities, isLoading: communitiesLoading, refetch: refetchCommunities } = useQuery({
    queryKey: ['recommended-communities'],
    queryFn: async () => {
      // In a real app, this would fetch from your backend
      const mockCommunities: Community[] = [
        {
          id: '1',
          name: 'Tech Innovators',
          description: 'Local tech enthusiasts sharing ideas',
          category: 'Technology',
          memberCount: 127,
          isJoined: false,
        },
        {
          id: '2',
          name: 'Morning Runners',
          description: 'Early morning running group',
          category: 'Fitness',
          memberCount: 89,
          isJoined: true,
        },
      ];
      return mockCommunities;
    },
    enabled: !!user,
  });

  const { data: upcomingEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      // In a real app, this would fetch from your backend
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Tech Meetup',
          date: new Date(Date.now() + 86400000), // Tomorrow
          location: 'Downtown Coffee Shop',
          communityName: 'Tech Innovators',
        },
        {
          id: '2',
          title: 'Morning Run',
          date: new Date(Date.now() + 172800000), // Day after tomorrow
          location: 'Central Park',
          communityName: 'Morning Runners',
        },
      ];
      return mockEvents;
    },
    enabled: !!user,
  });

  const onRefresh = async () => {
    await Promise.all([
      getCurrentLocation(),
      refetchCommunities(),
      refetchEvents(),
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    welcomeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    locationText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    seeAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.surface,
    },
    seeAllText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    cardDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    memberCount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },
    joinButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 12,
    },
    joinButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    eventDate: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    eventLocation: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <Icon name="person" size={24} color={colors.textSecondary} />
            )}
          </View>
          <View>
            <Text style={styles.welcomeText}>
              Welcome, {user?.displayName || 'Friend'}!
            </Text>
            {location && (
              <Text style={styles.locationText}>
                <Icon name="location-on" size={12} color={colors.textSecondary} />
                {' '}{location.city && location.state ? `${location.city}, ${location.state}` : 'Current location'}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="notifications" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={signOut}>
            <Icon name="logout" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={communitiesLoading || eventsLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Recommended Communities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Communities for You</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('Communities')}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {communities?.slice(0, 3).map((community) => (
            <View key={community.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{community.name}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{community.category}</Text>
              <Text style={styles.cardDescription}>{community.description}</Text>
              <Text style={styles.memberCount}>{community.memberCount} members</Text>
              {!community.isJoined && (
                <TouchableOpacity style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>Join Community</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>
          {upcomingEvents?.slice(0, 3).map((event) => (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{event.title}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{event.communityName}</Text>
              <Text style={styles.eventDate}>
                {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.eventLocation}>
                <Icon name="location-on" size={12} color={colors.textSecondary} />
                {' '}{event.location}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <Icon name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}