import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { location } = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.displayName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your digital third place for meaningful connections
            </p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Profile
            </h2>
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Interests:</span> {user?.interests?.join(', ') || 'None selected'}
              </p>
              {location && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Location:</span> Available
                </p>
              )}
            </div>
          </div>

          {/* Communities Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Communities
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Join communities based on your interests and location to start connecting with like-minded people.
            </p>
            <button className="mt-4 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
              Explore Communities
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                Create Event
              </button>
              <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Browse Messages
              </button>
              <button className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Update Profile
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Join communities and start participating to see your activity here.
          </p>
        </div>
      </div>
    </div>
  );
}