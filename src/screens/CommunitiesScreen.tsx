import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';

interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  isJoined: boolean;
  distance?: number;
}

const CATEGORIES = ['All', 'Technology', 'Fitness', 'Music', 'Art', 'Travel', 'Business'];

export default function CommunitiesScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { colors } = useTheme();

  const { data: communities, isLoading, refetch } = useQuery({
    queryKey: ['communities', selectedCategory, searchQuery],
    queryFn: async () => {
      // In a real app, this would fetch from your backend
      const mockCommunities: Community[] = [
        {
          id: '1',
          name: 'Tech Innovators',
          description: 'Local tech enthusiasts sharing ideas and building the future together',
          category: 'Technology',
          memberCount: 127,
          isJoined: false,
          distance: 2.3,
        },
        {
          id: '2',
          name: 'Morning Runners',
          description: 'Early morning running group for all fitness levels',
          category: 'Fitness',
          memberCount: 89,
          isJoined: true,
          distance: 1.8,
        },
        {
          id: '3',
          name: 'Photography Club',
          description: 'Capture the beauty around us through photography',
          category: 'Art',
          memberCount: 156,
          isJoined: false,
          distance: 3.1,
        },
        {
          id: '4',
          name: 'Startup Network',
          description: 'Entrepreneurs and startup enthusiasts connecting',
          category: 'Business',
          memberCount: 203,
          isJoined: false,
          distance: 4.5,
        },
      ];

      // Filter by category
      let filtered = selectedCategory === 'All' 
        ? mockCommunities 
        : mockCommunities.filter(c => c.category === selectedCategory);

      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return filtered;
    },
  });

  const renderCommunityCard = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => navigation.navigate('CommunityDetail', { communityId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.communityInfo}>
          <Text style={styles.communityName}>{item.name}</Text>
          <View style={styles.metaInfo}>
            <Text style={styles.category}>{item.category}</Text>
            {item.distance && (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.distance}>{item.distance} mi away</Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.joinButton,
            item.isJoined && styles.joinedButton,
          ]}
        >
          <Text
            style={[
              styles.joinButtonText,
              item.isJoined && styles.joinedButtonText,
            ]}
          >
            {item.isJoined ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.description}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.memberInfo}>
          <Icon name="group" size={16} color={colors.textSecondary} />
          <Text style={styles.memberCount}>{item.memberCount} members</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderCategoryChip = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        selectedCategory === category && styles.selectedCategoryChip,
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category && styles.selectedCategoryText,
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    categoriesContainer: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      marginRight: 8,
    },
    selectedCategoryChip: {
      backgroundColor: colors.primary,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    selectedCategoryText: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    communityCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 20,
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
    communityInfo: {
      flex: 1,
      marginRight: 12,
    },
    communityName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    metaInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    category: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    separator: {
      fontSize: 12,
      color: colors.textSecondary,
      marginHorizontal: 4,
    },
    distance: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberCount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    joinButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    joinedButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.success,
    },
    joinButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    joinedButtonText: {
      color: colors.success,
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
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Communities</Text>
        
        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          renderItem={({ item }) => renderCategoryChip(item)}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      <FlatList
        style={styles.content}
        data={communities}
        renderItem={renderCommunityCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? `No communities found for "${searchQuery}"`
                : 'No communities available'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}