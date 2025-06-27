// Force clear authentication state for clean deployment testing
import { auth } from "./firebase";

export async function resetAuthState() {
  try {
    // Sign out from Firebase
    await auth.signOut();
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Reload page to reset all state
    window.location.reload();
  } catch (error) {
    console.error('Error resetting auth state:', error);
    // Force reload anyway
    window.location.reload();
  }
}

// Auto-clear auth state if we detect inconsistent state
export function checkAuthConsistency() {
  const currentUser = auth.currentUser;
  if (currentUser) {
    console.log('Detected existing Firebase session. Clearing for clean deployment test...');
    resetAuthState();
  }
}