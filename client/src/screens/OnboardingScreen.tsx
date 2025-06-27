import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';

const interests = [
  'Technology', 'Sports', 'Music', 'Art', 'Travel', 'Food',
  'Books', 'Movies', 'Gaming', 'Fitness', 'Photography', 'Science'
];

export default function OnboardingScreen() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { updateUserProfile } = useAuth();
  const { requestPermission, getCurrentLocation } = useLocation();

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Request location permission
      await requestPermission();
      await getCurrentLocation();
      
      // Update user profile with onboarding completion
      await updateUserProfile({
        interests: selectedInterests,
        hasCompletedOnboarding: true
      });
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to TriPlace
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Let's set up your profile to find the perfect communities
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            What are your interests?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Select the topics you're passionate about to help us recommend relevant communities.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {interests.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedInterests.includes(interest)
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>

          <div className="border-t dark:border-gray-600 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Location Access
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We'll use your location to find nearby communities and events. Your privacy is important to us.
            </p>
          </div>

          <button
            onClick={handleComplete}
            disabled={loading || selectedInterests.length === 0}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}