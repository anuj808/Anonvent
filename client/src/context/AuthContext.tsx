import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';

interface AuthContextType {
  anonId: string | null;
  displayName: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anonId, setAnonId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      const response = await api.get('auth/me');
      if (response.data && response.data.anonId) {
        setAnonId(response.data.anonId);
        setDisplayName(response.data.displayName || response.data.anonId);
        setIsAdmin(!!response.data.isAdmin);
      } else {
        setAnonId(null);
        setDisplayName(null);
        setIsAdmin(false);
      }
    } catch (error) {
      setAnonId(null);
      setDisplayName(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('auth/login', { email, password });
    if (response.data && response.data.anonId) {
      setAnonId(response.data.anonId);
      setDisplayName(response.data.displayName || response.data.anonId);
      setIsAdmin(!!response.data.isAdmin);
      setIsAuthModalOpen(false);
    }
  };

  const register = async (email: string, password: string) => {
    const response = await api.post('auth/register', { email, password });
    if (response.data && response.data.anonId) {
      // Auto login user after registration for seamless UX
      await login(email, password);
    }
  };

  const logout = async () => {
    try {
      await api.post('auth/logout');
    } catch (error) {
      console.error('Logout error occurred');
    } finally {
      setAnonId(null);
      setDisplayName(null);
      setIsAdmin(false);
    }
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const isAuthenticated = !!anonId;

  return (
    <AuthContext.Provider
      value={{
        anonId,
        displayName,
        isAdmin,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
