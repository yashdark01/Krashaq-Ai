'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getBrowserApiBaseUrl } from '@/lib/api/base-url';
import { normalizeRole, isAdminRole, isSupplierRole, isFarmerRole } from '@/lib/auth/roles';
import {
  authenticatedFetch,
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  refreshAccessTokenClient,
  scheduleProactiveRefresh,
  storeTokens,
} from '@/lib/api/authenticated-fetch';

export type UserRole = 'admin' | 'supplier' | 'farmer' | string;

export interface User {
  id: string;
  email: string;
  name: string;
  default_location: string | null;
  role: UserRole;
  supplier_id?: string | null;
  state?: string | null;
  district?: string | null;
  tehsil?: string | null;
  locality?: string | null;
  pincode?: string | null;
  email_verified?: boolean;
  two_factor_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isSupplier: () => boolean;
  isFarmer: () => boolean;
  isPestisidesSupplier: () => boolean;
  getAccessToken: () => string | null;
  login: (code: string) => Promise<void>;
  emailLogin: (email: string, password: string) => Promise<MfaLoginChallenge | null>;
  verifyMfaLogin: (mfaToken: string, code: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchWithAuth: typeof authenticatedFetch;
}

export interface MfaLoginChallenge {
  requires_2fa: true;
  mfa_token: string;
  user: User;
}

interface RegisterData {
  email: string;
  name: string;
  default_location?: string;
  location_details?: string;
  phone?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  locality?: string;
  pincode?: string;
}

interface SignupData {
  email: string;
  name: string;
  password: string;
  state?: string;
  district?: string;
  tehsil?: string;
  locality?: string;
  pincode?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (token?: string) => {
    try {
      const response = await authenticatedFetch('/api/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        const profile: User = {
          id: String(data.id),
          email: data.email,
          name: data.name,
          default_location: data.default_location,
          role: normalizeRole(data.role),
          supplier_id: data.supplier_id ?? null,
          state: data.state,
          district: data.district,
          tehsil: data.tehsil,
          locality: data.locality,
          pincode: data.pincode,
          email_verified: data.email_verified,
          two_factor_enabled: data.two_factor_enabled,
        };
        setUser(profile);
        persistUser(profile);
      } else if (response.status === 401) {
        clearStoredTokens();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedAccessToken = getStoredAccessToken();
    const storedRefreshToken = getStoredRefreshToken();
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        setUser({ ...parsed, id: String(parsed.id), role: normalizeRole(parsed.role) });
      } catch {
        localStorage.removeItem('user');
      }
    }

    if (storedAccessToken && storedRefreshToken) {
      fetchUserProfile(storedAccessToken);
    } else {
      setIsLoading(false);
    }

    const stopRefresh = scheduleProactiveRefresh(
      Number(process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRE_MINUTES ?? 30)
    );

    const onTokensUpdated = () => {
      const t = getStoredAccessToken();
      if (t) fetchUserProfile(t);
    };
    window.addEventListener('krashaq:auth-tokens-updated', onTokensUpdated);

    return () => {
      stopRefresh();
      window.removeEventListener('krashaq:auth-tokens-updated', onTokensUpdated);
    };
  }, [fetchUserProfile]);

  const applyAuthResult = async (data: {
    access_token: string | null;
    refresh_token: string | null;
    user: User;
    requires_2fa?: boolean;
  }) => {
    if (data.requires_2fa) {
      throw new Error('Two-factor authentication required');
    }
    if (!data.access_token || !data.refresh_token) {
      throw new Error('Authentication failed');
    }
    storeTokens(data.access_token, data.refresh_token);
    setUser({ ...data.user, id: String(data.user.id) });
    persistUser({ ...data.user, id: String(data.user.id) });
    await fetchUserProfile(data.access_token);
  };

  const emailLogin = async (email: string, password: string): Promise<MfaLoginChallenge | null> => {
    const response = await fetch(`${getBrowserApiBaseUrl()}/api/auth/login/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.errors?.password?.[0] || 'Login failed');
    }

    if (data.requires_2fa && data.mfa_token) {
      return {
        requires_2fa: true,
        mfa_token: data.mfa_token,
        user: { ...data.user, id: String(data.user.id), role: normalizeRole(data.user.role) },
      };
    }

    await applyAuthResult(data);
    window.location.href = '/';
    return null;
  };

  const verifyMfaLogin = async (mfaToken: string, code: string) => {
    const response = await fetch(`${getBrowserApiBaseUrl()}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Invalid verification code');
    }

    await applyAuthResult(data);
    window.location.href = '/';
  };

  const login = async (code: string) => {
    const response = await fetch(`${getBrowserApiBaseUrl()}/api/auth/google/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) throw new Error('Login failed');

    const data = await response.json();
    localStorage.setItem('google_user_info', JSON.stringify(data.user_info));
    localStorage.setItem('google_tokens', JSON.stringify(data.google_tokens));
    window.location.href = '/auth/register';
  };

  const signup = async (data: SignupData) => {
    const response = await fetch(`${getBrowserApiBaseUrl()}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      const firstError =
        result.errors &&
        Object.values(result.errors as Record<string, string[]>)[0]?.[0];
      throw new Error(firstError || result.detail || 'Signup failed');
    }

    await applyAuthResult(result);
    window.location.href = '/';
  };

  const register = async (data: RegisterData) => {
    const response = await fetch(`${getBrowserApiBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        password: `oauth-${Date.now()}`,
      }),
    });

    if (!response.ok) throw new Error('Registration failed');

    const result = await response.json();
    await applyAuthResult(result);

    localStorage.removeItem('google_user_info');
    localStorage.removeItem('google_tokens');
    window.location.href = '/';
  };

  const logout = async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await fetch(`${getBrowserApiBaseUrl()}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearStoredTokens();
      setUser(null);
      window.dispatchEvent(new Event('krashaq:auth-logout'));
      window.location.href = '/auth/login';
    }
  };

  const refreshAccessToken = async () => {
    const token = await refreshAccessTokenClient();
    if (!token) {
      await logout();
      throw new Error('Token refresh failed');
    }
  };

  const refreshProfile = useCallback(async () => {
    const token = getStoredAccessToken();
    if (token) await fetchUserProfile(token);
  }, [fetchUserProfile]);

  const isAdmin = () => isAdminRole(user?.role);
  const isSupplier = () => isSupplierRole(user?.role);
  const isFarmer = () => isFarmerRole(user?.role);
  const isPestisidesSupplier = () => isSupplier();

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isSupplier,
        isFarmer,
        isPestisidesSupplier,
        getAccessToken: getStoredAccessToken,
        login,
        emailLogin,
        verifyMfaLogin,
        signup,
        register,
        logout,
        refreshAccessToken,
        refreshProfile,
        fetchWithAuth: authenticatedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
