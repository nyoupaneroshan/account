// Client-side session utilities - NO server-only imports here!
// This file can be safely imported from 'use client' components

export const CLIENT_SESSION_KEY = 'hisab-session-token'
export const SESSION_HEADER = 'x-session-token'

/**
 * Get session headers for client-side fetch requests
 * Call this on the client to include the session token
 */
export function getSessionHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(CLIENT_SESSION_KEY)
  if (!token) return {}
  return { [SESSION_HEADER]: token }
}

/**
 * Save session token to localStorage (client-side only)
 */
export function saveClientSession(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CLIENT_SESSION_KEY, userId)
}

/**
 * Clear session token from localStorage (client-side only)
 */
export function clearClientSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CLIENT_SESSION_KEY)
}

/**
 * Get session token from localStorage (client-side only)
 */
export function getClientSession(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CLIENT_SESSION_KEY)
}

/**
 * Helper to make authenticated fetch requests
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...options.headers,
    ...getSessionHeaders(),
  }
  return fetch(url, { ...options, headers })
}
