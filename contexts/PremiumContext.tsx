// contexts/PremiumContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_STORAGE_KEY = 'tottrackr_premium_status';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  setPremium: (value: boolean) => Promise<void>;
  checkPremium: () => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremiumState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
      const premium = stored === 'true';
      setIsPremiumState(premium);
    } catch (error) {
      console.error('[Premium] Failed to load status:', error);
      setIsPremiumState(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setPremium = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, value.toString());
      setIsPremiumState(value);
    } catch (error) {
      console.error('[Premium] Failed to save status:', error);
    }
  };

  const checkPremium = async (): Promise<boolean> => {
    // For now, just return the stored value
    // Later: Replace with PurchaseService.isPremium()
    const stored = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
    return stored === 'true';
  };

  return (
    <PremiumContext.Provider value={{ isPremium, isLoading, setPremium, checkPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
}