import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PremiumProvider } from '../contexts/PremiumContext';
import { PurchaseService } from '@/services/PurchaseService';


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    checkOnboarding();
  }, []);

  // Initialize RevenueCat (disabled until store connection)
  //  useEffect(() => {
  //  PurchaseService.configure();
  // }, []);
  

// Add this TEMPORARILY at the top of the component:
useEffect(() => {
  // TESTING: Force onboarding to show
  AsyncStorage.removeItem('tottrackr_baby_profile');
}, []);

  const checkOnboarding = async () => {
    try {
      const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
      
            
      setIsReady(true);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setIsReady(true);
    }
  };

  if (!loaded || !isReady) {
    return null;
  }

  return (
    <PremiumProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </PremiumProvider>
  );
}