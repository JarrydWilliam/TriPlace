import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Message {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  timestamp: Date;
  resonates: number;
}

interface Member {
  id: string;
  name: string;
  photoURL?: string;
  isOnline: boolean;
}

interface Event {
  id: string;
  title: string;
  date: Date;
  location: string;
  attendees: number;
}

export default function CommunityDetailScreen({ route, navigation }: any) {
  const { communityId } = route.params;
  const [activeTab, setActiveTab] = useState('feed');
  const [newMessage, setNewMessage] = useState('');
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => ({
      id: communityId,
      name: 'Tech Innovators',
      description: 'Local tech enthusiasts sharing ideas and building the future together',
      category: 'Technology',
      memberCount: 127,
      isJoined: true,
    }),
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['community-messages', communityId],
    queryFn: async (): Promise<Message[]> => [
      {
        id: '1',
        text: 'Looking forward to the next meetup! Who else is planning to attend?',
        authorId: 'user1',
        authorName: 'Alex Chen',
        timestamp: new Date(Date.now() - 3600000),
        resonates: 5,
      },
      {
        id: '2',
        text: 'Just shared a new article about React Native best practices. Check it out!',
        authorId: 'user2',
        authorName: 'Sarah Johnson',
        timestamp: new Date(Date.now() - 7200000),
        resonates: 12,
      },
    ],
  });

  const { data: members } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async (): Promise<Member[]> => [
      {
        id: 'user1',
        name: 'Alex Chen',
        isOnline: true,
      },
      {
        id: 'user2',
        name: 'Sarah Johnson',
        isOnline: false,
      },
      {
        id: 'user3',
        name: 'Mike Davis',
        isOnline: true,
      },
    ],
  });

  const { data: events } = useQuery({
    queryKey: ['community-events', communityId],
    queryFn: async (): Promise<Event[]> => [
      {
        id: '1',
        title: 'Tech Meetup: AI & Machine Learning',
        date: new Date(Date.now() + 86400000),
        location: 'Downtown Coffee Shop',
        attendees: 23,
      },
      {
        id: '2',
        title: 'Coding Workshop: React Native',
        date: new Date(Date.now() + 172800000),
        location: 'Tech Hub',
        attendees: 15,
      },
    ],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const newMsg: Message = {
        id: Date.now().toString(),
        text,
        authorId: user!.id,
        authorName: user!.displayName,
        timestamp: new Date(),
        resonates: 0,
      };
      return newMsg;
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['community-messages', communityId], (old: Message[] = []) => [
        newMessage,
        ...old,
      ]);
      setNewMessage('');
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.authorName[0]}</Text>
        </View>
        <View style={styles.messageInfo}>
          <Text style={styles.authorName}>{item.authorName}</Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      <Text style={styles.messageText}>{item.text}</Text>
      <View style={styles.messageActions}>
        <TouchableOpacity style={styles.resonateButton}>
          <Icon name="favorite-border" size={16} color={colors.textSecondary} />
          <Text style={styles.resonateCount}>{item.resonates}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={[styles.avatar, item.isOnline && styles.onlineAvatar]}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>
        <View>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberStatus}>
            {item.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.messageUserButton}>
        <Icon name="chat" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderEvent = ({ item }: { item: Event }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <TouchableOpacity style={styles.joinEventButton}>
          <Text style={styles.joinEventText}>Join</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.eventDate}>
        {item.date.toLocaleDateString()} at {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <Text style={styles.eventLocation}>
        <Icon name="location-on" size={14} color={colors.textSecondary} />
        {' '}{item.location}
      </Text>
      <Text style={styles.eventAttendees}>{item.attendees} attending</Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerContent: {
      flex: 1,
    },
    communityName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    memberCount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.primary,
    },
    content: {
      flex: 1,
    },
    messageInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    messageInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
      marginRight: 12,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageCard: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 4,
      borderRadius: 12,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    onlineAvatar: {
      borderWidth: 2,
      borderColor: colors.success,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
    messageInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    timestamp: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messageText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 8,
    },
    messageActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    resonateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    resonateCount: {
      marginLeft: 4,
      fontSize: 12,
      color: colors.textSecondary,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 4,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    memberStatus: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messageUserButton: {
      padding: 8,
    },
    eventCard: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 4,
      borderRadius: 12,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 12,
    },
    joinEventButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    joinEventText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    eventDate: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
      marginBottom: 4,
    },
    eventLocation: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    eventAttendees: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'members':
        return (
          <FlatList
            data={members}
            renderItem={renderMember}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'events':
        return (
          <FlatList
            data={events}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.communityName}>{community?.name}</Text>
          <Text style={styles.memberCount}>{community?.memberCount} members</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {['feed', 'members', 'events'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {activeTab === 'feed' && (
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Share something with the community..."
            placeholderTextColor={colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}