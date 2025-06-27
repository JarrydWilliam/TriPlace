import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EventFormData {
  title: string;
  description: string;
  date: Date;
  time: Date;
  location: string;
  isVirtual: boolean;
  virtualLink?: string;
  category: string;
  maxAttendees?: number;
  isPrivate: boolean;
  price?: number;
  communityId?: string;
}

const EVENT_CATEGORIES = [
  'Networking',
  'Workshop',
  'Social',
  'Educational',
  'Fitness',
  'Technology',
  'Art & Culture',
  'Business',
  'Other',
];

export default function CreateEventScreen({ navigation }: any) {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: new Date(),
    time: new Date(),
    location: '',
    isVirtual: false,
    category: 'Networking',
    isPrivate: false,
  });
  
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventFormData) => {
      // In a real app, this would send to your backend
      const newEvent = {
        id: Date.now().toString(),
        ...eventData,
        creatorId: user!.id,
        createdAt: new Date(),
        attendees: [],
      };
      return newEvent;
    },
    onSuccess: () => {
      Alert.alert(
        'Event Created',
        'Your event has been created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create event. Please try again.');
    },
  });

  const handleCreate = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter an event description');
      return;
    }
    if (!formData.location.trim() && !formData.isVirtual) {
      Alert.alert('Error', 'Please enter a location or mark as virtual event');
      return;
    }
    if (formData.isVirtual && !formData.virtualLink?.trim()) {
      Alert.alert('Error', 'Please enter a virtual event link');
      return;
    }

    createEventMutation.mutate(formData);
  };

  const updateFormData = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    createButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    createButtonDisabled: {
      opacity: 0.6,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    switchLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    selectedCategoryChip: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryText: {
      fontSize: 14,
      color: colors.text,
    },
    selectedCategoryText: {
      color: '#FFFFFF',
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    dateTimeInput: {
      flex: 1,
    },
    numberInput: {
      width: 100,
    },
    helpText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    revenueInfo: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 8,
      marginTop: 8,
    },
    revenueTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    revenueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    revenueLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    revenueValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Event</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.createButton,
            createEventMutation.isPending && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={createEventMutation.isPending}
        >
          <Text style={styles.createButtonText}>
            {createEventMutation.isPending ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event title"
              placeholderTextColor={colors.textSecondary}
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your event..."
              placeholderTextColor={colors.textSecondary}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              multiline
              maxLength={500}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {EVENT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    formData.category === category && styles.selectedCategoryChip,
                  ]}
                  onPress={() => updateFormData('category', category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      formData.category === category && styles.selectedCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          
          <View style={styles.dateTimeContainer}>
            <View style={[styles.inputContainer, styles.dateTimeInput]}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity style={styles.input}>
                <Text style={{ color: colors.text }}>
                  {formData.date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputContainer, styles.dateTimeInput]}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity style={styles.input}>
                <Text style={{ color: colors.text }}>
                  {formData.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Virtual Event</Text>
            <Switch
              value={formData.isVirtual}
              onValueChange={(value) => updateFormData('isVirtual', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {formData.isVirtual ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Virtual Link</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter meeting link (Zoom, Teams, etc.)"
                placeholderTextColor={colors.textSecondary}
                value={formData.virtualLink}
                onChangeText={(text) => updateFormData('virtualLink', text)}
                keyboardType="url"
              />
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Physical Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter venue address"
                placeholderTextColor={colors.textSecondary}
                value={formData.location}
                onChangeText={(text) => updateFormData('location', text)}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Settings</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Maximum Attendees (Optional)</Text>
            <TextInput
              style={[styles.input, styles.numberInput]}
              placeholder="No limit"
              placeholderTextColor={colors.textSecondary}
              value={formData.maxAttendees?.toString()}
              onChangeText={(text) => updateFormData('maxAttendees', text ? parseInt(text) : undefined)}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Leave empty for unlimited attendees</Text>
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Private Event</Text>
            <Switch
              value={formData.isPrivate}
              onValueChange={(value) => updateFormData('isPrivate', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ticket Price (Optional)</Text>
            <TextInput
              style={[styles.input, styles.numberInput]}
              placeholder="Free"
              placeholderTextColor={colors.textSecondary}
              value={formData.price?.toString()}
              onChangeText={(text) => updateFormData('price', text ? parseFloat(text) : undefined)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.helpText}>Leave empty for free events</Text>
          </View>

          {formData.price && formData.price > 0 && (
            <View style={styles.revenueInfo}>
              <Text style={styles.revenueTitle}>Revenue Breakdown</Text>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Ticket Price:</Text>
                <Text style={styles.revenueValue}>${formData.price.toFixed(2)}</Text>
              </View>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Platform Fee (7%):</Text>
                <Text style={styles.revenueValue}>-${(formData.price * 0.07).toFixed(2)}</Text>
              </View>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Your Earnings:</Text>
                <Text style={styles.revenueValue}>${(formData.price * 0.93).toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}