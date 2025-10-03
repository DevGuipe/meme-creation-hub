import { logger } from '@/lib/logger';

export interface AppError extends Error {
  code?: string;
  details?: unknown;
  userFriendly?: boolean;
}

export const createAppError = (
  message: string,
  code?: string,
  details?: unknown,
  userFriendly = false
): AppError => {
  const error = new Error(message) as AppError;
  error.code = code;
  error.details = details;
  error.userFriendly = userFriendly;
  return error;
};

export const handleSupabaseError = (error: any, operation: string): AppError => {
  logger.error(`Supabase ${operation} error`, error);
  
  if (error?.code === 'PGRST116') {
    return createAppError(
      'No data found for this request',
      'NO_DATA_FOUND',
      error,
      true
    );
  }
  
  if (error?.code === '42501') {
    return createAppError(
      'Permission denied for this operation',
      'PERMISSION_DENIED', 
      error,
      true
    );
  }

  if (error?.message?.includes('violates row-level security')) {
    return createAppError(
      'Access denied - please check your permissions',
      'RLS_VIOLATION',
      error,
      true
    );
  }

  return createAppError(
    `${operation} failed: ${error?.message || 'Unknown error'}`,
    error?.code || 'UNKNOWN_ERROR',
    error,
    false
  );
};

export const isNetworkError = (error: any): boolean => {
  return (
    error?.name === 'NetworkError' ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.code === 'NETWORK_ERROR'
  );
};

export const getUserFriendlyMessage = (error: AppError): string => {
  if (error.userFriendly) {
    return error.message;
  }

  if (isNetworkError(error)) {
    return 'Connection error. Please check your internet and try again.';
  }

  return 'Something went wrong. Please try again later.';
};

// Safely convert unknown errors/values to a readable message string (never [object Object])
export const safeString = (input: unknown, fallback = 'Unexpected error'): string => {
  if (input == null) return fallback;
  if (typeof input === 'string') return input;
  if (input instanceof Error) return input.message || fallback;
  if (typeof input === 'object') {
    const maybe = (input as any).message || (input as any).error || (input as any).msg || (input as any).statusText;
    if (typeof maybe === 'string') return maybe;
    try { return JSON.stringify(input); } catch { return fallback; }
  }
  return String(input);
};

// Normalize Supabase Edge Function error payload + client error into a single user-facing string
export const normalizeEdgeError = (
  response: any,
  error: any,
  fallback = 'Edge function error'
): string => {
  const parts: string[] = [];
  parts.push(safeString(error, fallback));
  const respError = response?.data?.error;
  if (respError) parts.push(safeString(respError));
  const details = response?.data?.details;
  if (Array.isArray(details)) parts.push(details.join(' | '));
  return parts.filter(Boolean).join(': ');
};