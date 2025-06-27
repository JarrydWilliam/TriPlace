import { User } from "firebase/auth";

export interface AuthValidationResult {
  isValid: boolean;
  needsOnboarding: boolean;
  errors: string[];
}

export function validateAuthState(firebaseUser: User | null, dbUser: any): AuthValidationResult {
  const errors: string[] = [];
  
  if (!firebaseUser) {
    errors.push("No authenticated user found");
    return { isValid: false, needsOnboarding: false, errors };
  }
  
  if (!firebaseUser.emailVerified && firebaseUser.providerData[0]?.providerId === 'password') {
    errors.push("Email not verified");
  }
  
  if (!dbUser) {
    return { isValid: true, needsOnboarding: true, errors };
  }
  
  const needsOnboarding = !dbUser.onboardingCompleted || 
                         !dbUser.interests || 
                         dbUser.interests.length === 0;
  
  return { 
    isValid: true, 
    needsOnboarding, 
    errors 
  };
}

export function getRequiredUserFields(): string[] {
  return [
    'name',
    'email',
    'interests',
    'onboardingCompleted'
  ];
}

export function validateUserProfile(user: any): { isValid: boolean; missingFields: string[] } {
  const required = getRequiredUserFields();
  const missing = required.filter(field => !user[field] || 
    (Array.isArray(user[field]) && user[field].length === 0));
  
  return {
    isValid: missing.length === 0,
    missingFields: missing
  };
}