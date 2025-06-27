export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return new ApiError('Connection failed. Please check your internet connection.', 0, 'NETWORK_ERROR');
    }
    
    // Timeout errors
    if (error.message.includes('timeout')) {
      return new ApiError('Request timed out. Please try again.', 408, 'TIMEOUT_ERROR');
    }
    
    return new ApiError(error.message);
  }
  
  return new ApiError('An unexpected error occurred');
}

export function getErrorMessage(error: unknown): string {
  const apiError = handleApiError(error);
  
  switch (apiError.status) {
    case 401:
      return 'You need to sign in to access this feature.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 0:
      return apiError.message; // Network errors
    default:
      return apiError.message || 'Something went wrong. Please try again.';
  }
}