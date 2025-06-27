import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { colors, theme, setTheme } = useTheme();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleThemeChange = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const profileSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person',
          label: 'Edit Profile',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'notifications',
          label: 'Notifications',
          onPress: () => navigation.navigate('NotificationSettings'),
        },
        {
          icon: 'privacy-tip',
          label: 'Privacy & Security',
          onPress: () => navigation.navigate('PrivacySettings'),
        },
      ],
    },
    {
      title: 'Communities',
      items: [
        {
          icon: 'groups',
          label: 'My Communities',
          subtitle: `${user?.communities?.length || 0} joined`,
          onPress: () => navigation.navigate('MyCommunities'),
        },
        {
          icon: 'interests',
          label: 'Interests',
          subtitle: `${user?.interests?.length || 0} selected`,
          onPress: () => navigation.navigate('EditInterests'),
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          icon: 'palette',
          label: 'Theme',
          subtitle: theme.charAt(0).toUpperCase() + theme.slice(1),
          onPress: handleThemeChange,
        },
        {
          icon: 'language',
          label: 'Language',
          subtitle: 'English',
          onPress: () => {},
        },
        {
          icon: 'location-on',
          label: 'Location Services',
          onPress: () => navigation.navigate('LocationSettings'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help',
          label: 'Help & Support',
          onPress: () => navigation.navigate('Help'),
        },
        {
          icon: 'feedback',
          label: 'Send Feedback',
          onPress: () => navigation.navigate('Feedback'),
        },
        {
          icon: 'info',
          label: 'About TriPlace',
          onPress: () => navigation.navigate('About'),
        },
      ],
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: 'center',
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: 'bold',
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    userLocation: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    content: {
      flex: 1,
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
      paddingHorizontal: 20,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingIcon: {
      width: 24,
      marginRight: 16,
    },
    settingContent: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    settingSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    chevron: {
      marginLeft: 8,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error,
      paddingVertical: 16,
      marginHorizontal: 20,
      marginVertical: 24,
      borderRadius: 12,
    },
    signOutText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 16,
      backgroundColor: colors.surface,
      marginBottom: 24,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatar}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.displayName?.[0] || user?.email?.[0] || 'U'}
              </Text>
            )}
          </View>
          <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.location && (
            <View style={styles.userLocation}>
              <Icon name="location-on" size={16} color={colors.textSecondary} />
              <Text style={styles.locationText}>
                {user.location.city && user.location.state
                  ? `${user.location.city}, ${user.location.state}`
                  : 'Location set'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.communities?.length || 0}</Text>
            <Text style={styles.statLabel}>Communities</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.interests?.length || 0}</Text>
            <Text style={styles.statLabel}>Interests</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {user?.createdAt ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0}
            </Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
        </View>

        <View style={styles.content}>
          {profileSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.settingItem}
                  onPress={item.onPress}
                >
                  <Icon
                    name={item.icon}
                    size={24}
                    color={colors.text}
                    style={styles.settingIcon}
                  />
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Icon name="logout" size={20} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}