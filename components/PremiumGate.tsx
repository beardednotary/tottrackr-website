// components/PremiumGate.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { GlassCard } from '@/components/GlassCard';
import * as Haptics from 'expo-haptics';
import { usePremium } from '../contexts/PremiumContext';

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string; // Optional feature name for display
}

/**
 * Wrap any premium feature with this component.
 * If user doesn't have premium, shows upgrade prompt instead.
 */
export function PremiumGate({ children, feature }: PremiumGateProps) {
  const { isPremium } = usePremium();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <GlassCard style={styles.lockedCard}>
      <View style={styles.lockedContent}>
        <View style={[styles.lockIcon, { backgroundColor: colors.backgroundSecondary }]}>
          <MaterialCommunityIcons name="lock" size={32} color={colors.textSecondary} />
        </View>
        
        <Text style={[styles.lockedTitle, { color: colors.text }]}>
          Premium Feature
        </Text>
        
        {feature && (
          <Text style={[styles.lockedDescription, { color: colors.textSecondary }]}>
            {feature} is available with Premium
          </Text>
        )}

        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/premium');
          }}
        >
          <MaterialCommunityIcons name="crown" size={18} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

/**
 * Inline premium badge for list items
 */
export function PremiumBadge() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.badge, { backgroundColor: colors.tint }]}>
      <MaterialCommunityIcons name="crown" size={12} color="#FFFFFF" />
      <Text style={styles.badgeText}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  lockedContent: {
    alignItems: 'center',
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});