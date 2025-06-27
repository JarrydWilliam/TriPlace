import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';

interface Conversation {
  id: string;
  participantName: string;
  participantPhoto?: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
}

export default function MessagesScreen({ navigation }: any) {
  const { colors } = useTheme();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<Conversation[]> => [
      {
        id: '1',
        participantName: 'Alex Chen',
        lastMessage: 'See you at the meetup tomorrow!',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        unreadCount: 2,
        isOnline: true,
      },
      {
        id: '2',
        participantName: 'Sarah Johnson',
        lastMessage: 'Thanks for sharing that article',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        unreadCount: 0,
        isOnline: false,
      },
      {
        id: '3',
        participantName: 'Mike Davis',
        lastMessage: 'Looking forward to the workshop',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        unreadCount: 1,
        isOnline: true,
      },
    ],
  });

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => navigation.navigate('ChatDetail', { conversationId: item.id })}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, item.isOnline && styles.onlineAvatar]}>
          {item.participantPhoto ? (
            <Image source={{ uri: item.participantPhoto }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>{item.participantName[0]}</Text>
          )}
        </View>
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.participantName}>{item.participantName}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <View style={styles.messagePreview}>
          <Text
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    newMessageButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    conversationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    onlineAvatar: {
      borderWidth: 2,
      borderColor: colors.success,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.background,
    },
    conversationContent: {
      flex: 1,
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    participantName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    timestamp: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messagePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    lastMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    unreadMessage: {
      color: colors.text,
      fontWeight: '500',
    },
    unreadBadge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    unreadCount: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newMessageButton}>
          <Icon name="edit" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="chat-bubble-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              No messages yet.{'\n'}Start connecting with community members!
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}