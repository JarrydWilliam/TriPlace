import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  FlatList,
  Image,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Community {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  location?: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  communityId: number;
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch communities with caching for instant loading
  const { data: communities = [], isLoading: communitiesLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      // Load from cache first for instant display
      const cached = await AsyncStorage.getItem('communities');
      if (cached) {
        const cachedData = JSON.parse(cached);
        return cachedData;
      }

      // Fetch fresh data
      const response = await fetch('https://your-replit-app.replit.app/api/communities');
      const data = await response.json();
      
      // Cache for next time
      await AsyncStorage.setItem('communities', JSON.stringify(data));
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user's events
  const { data: userEvents = [] } = useQuery({
    queryKey: ['userEvents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`https://your-replit-app.replit.app/api/users/${user.id}/events`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['communities'] });
    await queryClient.invalidateQueries({ queryKey: ['userEvents'] });
    setRefreshing(false);
  };

  const joinCommunity = async (communityId: number) => {
    try {
      const response = await fetch(`https://your-replit-app.replit.app/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['communities'] });
      }
    } catch (error) {
      console.error('Failed to join community:', error);
    }
  };

  const renderCommunityCard = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => navigation.navigate('Community', { communityId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.communityHeader}>
        <Text style={styles.communityName}>{item.name}</Text>
        <Text style={styles.communityCategory}>{item.category}</Text>
      </View>
      <Text style={styles.communityDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.communityFooter}>
        <Text style={styles.memberCount}>{item.memberCount} members</Text>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => joinCommunity(item.id)}
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard} activeOpacity={0.8}>
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventDate}>
        {new Date(item.date).toLocaleDateString()}
      </Text>
      <Text style={styles.eventLocation}>{item.location}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.avatarContainer}
        >
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <Text style={styles.actionButtonIcon}>+</Text>
            <Text style={styles.actionButtonText}>Create Event</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Messaging')}
          >
            <Text style={styles.actionButtonIcon}>💬</Text>
            <Text style={styles.actionButtonText}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {userEvents.length > 0 ? (
            <FlatList
              data={userEvents.slice(0, 3)}
              renderItem={renderEventCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsContainer}
            />
          ) : (
            <Text style={styles.emptyText}>
              Join communities to see events
            </Text>
          )}
        </View>

        {/* Communities That Grow With You */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communities That Grow With You</Text>
          <FlatList
            data={communities.slice(0, 5)}
            renderItem={renderCommunityCard}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Weekly Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Challenges</Text>
          <View style={styles.challengeCard}>
            <Text style={styles.challengeTitle}>Connect & Engage</Text>
            <Text style={styles.challengeDescription}>
              Join 2 new communities this week
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '30%' }]} />
            </View>
            <Text style={styles.progressText}>1 of 2 completed</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  avatarContainer: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  communityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  communityCategory: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '500',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  communityDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 16,
  },
  communityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 12,
    color: '#64748B',
  },
  joinButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventsContainer: {
    paddingRight: 20,
  },
  eventCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    width: width * 0.7,
    borderWidth: 1,
    borderColor: '#334155',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: '#60A5FA',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  challengeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
  },
});