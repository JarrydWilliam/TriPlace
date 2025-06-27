import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';

const INTEREST_OPTIONS = [
  'Technology', 'Fitness', 'Music', 'Art', 'Travel', 'Cooking', 
  'Photography', 'Reading', 'Gaming', 'Sports', 'Nature', 'Business',
  'Volunteering', 'Learning', 'Wellness', 'Community Service'
];

interface OnboardingStep {
  title: string;
  subtitle: string;
  component: React.ComponentType<any>;
}

function InterestsStep({ selectedInterests, onToggleInterest }: any) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      padding: 20,
    },
    interestGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    interestChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    interestChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    interestText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    interestTextSelected: {
      color: '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.interestGrid}>
        {INTEREST_OPTIONS.map((interest) => {
          const isSelected = selectedInterests.includes(interest);
          return (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestChip,
                isSelected && styles.interestChipSelected,
              ]}
              onPress={() => onToggleInterest(interest)}
            >
              <Text
                style={[
                  styles.interestText,
                  isSelected && styles.interestTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function LocationStep() {
  const { location, loading, error, getCurrentLocation } = useLocation();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      padding: 20,
      alignItems: 'center',
    },
    locationCard: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
    },
    locationText: {
      color: colors.text,
      fontSize: 16,
      marginTop: 12,
      textAlign: 'center',
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 12,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.locationCard}>
        <Icon
          name="location-on"
          size={48}
          color={location ? colors.success : colors.textSecondary}
        />
        {loading ? (
          <Text style={styles.locationText}>Getting your location...</Text>
        ) : location ? (
          <Text style={styles.locationText}>
            {location.city && location.state
              ? `${location.city}, ${location.state}`
              : 'Location detected'}
          </Text>
        ) : (
          <>
            <Text style={styles.locationText}>
              Location helps us find nearby communities
            </Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity style={styles.button} onPress={getCurrentLocation}>
              <Text style={styles.buttonText}>Enable Location</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { updateUserProfile } = useAuth();
  const { location } = useLocation();
  const { colors } = useTheme();

  const steps: OnboardingStep[] = [
    {
      title: 'Welcome to TriPlace',
      subtitle: 'Let\'s personalize your experience',
      component: () => (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Icon name="groups" size={80} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center', marginTop: 20 }}>
            TriPlace is your digital third place where authentic connections happen through shared interests and local communities.
          </Text>
        </View>
      ),
    },
    {
      title: 'What are your interests?',
      subtitle: 'Select topics you\'re passionate about',
      component: InterestsStep,
    },
    {
      title: 'Enable Location',
      subtitle: 'Find communities and events near you',
      component: LocationStep,
    },
  ];

  const handleToggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (selectedInterests.length === 0) {
      Alert.alert('Please select at least one interest to continue');
      return;
    }

    setLoading(true);
    try {
      const updates: any = {
        interests: selectedInterests,
        hasCompletedOnboarding: true,
      };

      if (location) {
        updates.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city,
          state: location.state,
        };
      }

      await updateUserProfile(updates);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return selectedInterests.length > 0;
    return true;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      alignItems: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      marginHorizontal: 4,
    },
    progressDotActive: {
      backgroundColor: colors.primary,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextPrimary: {
      color: '#FFFFFF',
    },
    buttonTextSecondary: {
      color: colors.text,
    },
  });

  const currentStepData = steps[currentStep];
  const Component = currentStepData.component;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.title}>{currentStepData.title}</Text>
        <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Component
          selectedInterests={selectedInterests}
          onToggleInterest={handleToggleInterest}
        />
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleBack}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Back
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            (!canProceed() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || loading}
        >
          <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
            {loading
              ? 'Please wait...'
              : currentStep === steps.length - 1
              ? 'Get Started'
              : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}