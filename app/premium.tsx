import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { GlassCard } from '@/components/GlassCard';
import { PurchaseService } from '@/services/PurchaseService';
import { usePremium } from '../contexts/PremiumContext';

const PREMIUM_PRICE = '$19.99';

const PREMIUM_FEATURES = [
  {
    icon: 'cloud-sync',
    title: 'Multi-Device Sync',
    description: 'Access your data from any device, always in sync',
  },
  {
    icon: 'calendar-check',
    title: 'Unlimited History',
    description: 'Keep all your tracking data forever',
  },
  {
    icon: 'account-multiple',
    title: 'Multiple Babies',
    description: 'Track multiple children in one app',
  },
  {
    icon: 'file-pdf-box',
    title: 'PDF Export',
    description: 'Beautiful reports to share with your pediatrician',
  },
  {
    icon: 'chart-line',
    title: 'Advanced Analytics',
    description: 'Detailed charts and pattern analysis',
  },
  {
    icon: 'human-male-height',
    title: 'Growth Charts',
    description: 'Track weight and height against WHO percentiles',
  },
  {
    icon: 'star-circle',
    title: 'All Future Features',
    description: 'Every premium feature we add, included forever',
  },
];

export default function PremiumScreen() {
  const { setPremium } = usePremium();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);  
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handlePurchase = async () => {
  setIsPurchasing(true);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  try {
    const result = await PurchaseService.purchasePremium();

    if (result.success) {
      // Grant premium access
      await setPremium(true);
      
      Alert.alert(
        'Welcome to Premium! 🎉',
        'You now have access to all premium features!',
        [
          {
            text: 'Get Started',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      // Show error (unless cancelled)
      if (result.error !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    }
  } catch (error) {
    Alert.alert('Error', 'Something went wrong. Please try again.');
  } finally {
    setIsPurchasing(false);
  }
};

  const handleRestore = async () => {
  setIsRestoring(true);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  try {
    const result = await PurchaseService.restorePurchases();

    if (result.success) {
      // Grant premium access
      await setPremium(true);
      
      Alert.alert(
        'Restore Successful! ✓',
        'Your premium access has been restored.',
        [
          {
            text: 'Continue',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert(
        'No Purchases Found',
        result.error || 'We couldn\'t find any previous purchases for this account.'
      );
    }
  } catch (error) {
    Alert.alert('Restore Failed', 'Please try again or contact support.');
  } finally {
    setIsRestoring(false);
  }
};

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(147, 51, 234, 0.15)', 'rgba(147, 51, 234, 0.05)', 'rgba(0, 0, 0, 0)']
            : ['rgba(147, 51, 234, 0.08)', 'rgba(147, 51, 234, 0.03)', 'rgba(0, 0, 0, 0)']
        }
        style={[styles.gradientBackground, { paddingTop: insets.top }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <MaterialCommunityIcons name="chevron-left" size={32} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Premium</Text>
          </View>

          <View style={styles.crownContainer}>
            <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: colors.tint }]}>
              <MaterialCommunityIcons name="star" size={48} color="#FFFFFF" />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Unlock Premium
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              One-time payment • Lifetime access
            </Text>
            <View style={styles.priceBadge}>
              <Text style={[styles.priceText, { color: colors.tint }]}>
                {PREMIUM_PRICE}
              </Text>
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Everything Included:
            </Text>

            {PREMIUM_FEATURES.map((feature, index) => (
              <GlassCard key={index} style={styles.featureCard}>
                <View style={styles.featureContent}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.backgroundSecondary }]}>
                    <MaterialCommunityIcons
                      name={feature.icon as any}
                      size={24}
                      color={colors.tint}
                    />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>
                      {feature.title}
                    </Text>
                    <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                      {feature.description}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={colors.tint}
                  />
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Why Premium Section */}
          <GlassCard style={styles.whyCard}>
            <Text style={[styles.whyTitle, { color: colors.text }]}>
              Why Premium?
            </Text>
            <Text style={[styles.whyText, { color: colors.textSecondary }]}>
              Premium helps us keep TotTrackr ad-free and focused on what matters: helping you track your baby's care without the hassle.
            </Text>
            <Text style={[styles.whyText, { color: colors.textSecondary, marginTop: 12 }]}>
              Your one-time payment includes all current features plus everything we add in the future. No subscriptions, no surprises.
            </Text>
          </GlassCard>

          {/* Free vs Premium Comparison */}
          <View style={styles.comparisonSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Free vs Premium:
            </Text>
            
            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                {' '}Core tracking (feed, sleep, diaper)
              </Text>
              <Text style={[styles.comparisonBadge, styles.freeBadge]}>FREE</Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                {' '}30-day history
              </Text>
              <Text style={[styles.comparisonBadge, styles.freeBadge]}>FREE</Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                {' '}Single device
              </Text>
              <Text style={[styles.comparisonBadge, styles.freeBadge]}>FREE</Text>
            </View>

            <View style={[styles.comparisonRow, { marginTop: 16 }]}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
                {' '}Multi-device sync
              </Text>
              <Text style={[styles.comparisonBadge, styles.premiumBadge, { backgroundColor: colors.tint }]}>
                PREMIUM
              </Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
                {' '}Unlimited history
              </Text>
              <Text style={[styles.comparisonBadge, styles.premiumBadge, { backgroundColor: colors.tint }]}>
                PREMIUM
              </Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
                {' '}Multiple babies
              </Text>
              <Text style={[styles.comparisonBadge, styles.premiumBadge, { backgroundColor: colors.tint }]}>
                PREMIUM
              </Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonItem, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
                {' '}Advanced features
              </Text>
              <Text style={[styles.comparisonBadge, styles.premiumBadge, { backgroundColor: colors.tint }]}>
                PREMIUM
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom CTA */}
        <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 20, backgroundColor: colors.background }]}>
          {/* Purchase Button */}
<TouchableOpacity
  style={[styles.purchaseButton, { backgroundColor: colors.tint }]}
  onPress={handlePurchase}
  disabled={isPurchasing}
>
  <MaterialCommunityIcons 
    name={isPurchasing ? 'loading' : 'crown'} 
    size={24} 
    color="#FFFFFF" 
  />
  <Text style={styles.purchaseButtonText}>
    {isPurchasing ? 'Processing...' : 'Unlock Premium • $19.99'}
  </Text>
</TouchableOpacity>

{/* Restore Button */}
<TouchableOpacity
  style={styles.restoreButton}
  onPress={handleRestore}
  disabled={isRestoring}
>
  <Text style={[styles.restoreButtonText, { color: colors.text }]}>
    {isRestoring ? 'Restoring...' : 'Restore Purchase'}
  </Text>
</TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  crownContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
  },
  priceBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  priceText: {
    fontSize: 28,
    fontWeight: '700',
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  featureCard: {
    marginBottom: 12,
    padding: 16,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  whyCard: {
    padding: 20,
    marginBottom: 32,
  },
  whyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  whyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  comparisonSection: {
    marginBottom: 32,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  comparisonItem: {
    fontSize: 14,
    flex: 1,
  },
  comparisonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  freeBadge: {
    backgroundColor: '#10B981',
  },
  premiumBadge: {
    // backgroundColor set inline with colors.tint
  },
  bottomCTA: {
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});