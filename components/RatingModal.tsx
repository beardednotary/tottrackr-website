import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useColorScheme,
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';

const RATING_STORAGE_KEY = 'tottrackr_rating_status';
const ACTIONS_COUNT_KEY = 'tottrackr_actions_count';

// Configuration
const MIN_ACTIONS_BEFORE_PROMPT = 2; // Show after 10 logged actions
const MIN_DAYS_BEFORE_PROMPT = 3; // Or after 3 days
const DAYS_BEFORE_REPROMPT = 15; // If "Later", ask again in 30 days

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RatingModal({ visible, onClose }: RatingModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleRate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mark as rated
    await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify({
      status: 'rated',
      timestamp: Date.now(),
    }));

    // Try native store review first
    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable) {
      await StoreReview.requestReview();
    } else {
      // Fallback to opening store directly
      const storeUrl = Platform.select({
        ios: 'https://apps.apple.com/app/tottrackr/id[YOUR_APP_ID]', // Replace after approval
        android: 'https://play.google.com/store/apps/details?id=com.tottrackr', // Replace with real ID
      });
      if (storeUrl) {
        Linking.openURL(storeUrl);
      }
    }

    onClose();
  };

  const handleLater = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Schedule to ask again later
    await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify({
      status: 'later',
      timestamp: Date.now(),
    }));

    onClose();
  };

  const handleNever = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Never ask again
    await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify({
      status: 'never',
      timestamp: Date.now(),
    }));

    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.tint }]}>
            <MaterialCommunityIcons name="star" size={32} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Enjoying TotTrackr?
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Your rating helps other exhausted parents find us. It only takes a second!
          </Text>

          {/* Stars decoration */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <MaterialCommunityIcons
                key={star}
                name="star"
                size={28}
                color="#FFD700"
              />
            ))}
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={handleRate}
          >
            <MaterialCommunityIcons name="star" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Rate TotTrackr</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={handleLater}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textButton}
            onPress={handleNever}
          >
            <Text style={[styles.textButtonText, { color: colors.textSecondary }]}>
              Don't ask again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Call this after each logged action (feeding, diaper, sleep)
 * to increment the counter and check if we should show rating prompt
 */
export async function incrementActionCount(): Promise<void> {
  try {
    const countStr = await AsyncStorage.getItem(ACTIONS_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    await AsyncStorage.setItem(ACTIONS_COUNT_KEY, (count + 1).toString());
  } catch (error) {
    console.error('[Rating] Failed to increment action count:', error);
  }
}

/**
 * Check if we should show the rating modal
 * Returns true if conditions are met
 */
export async function shouldShowRatingPrompt(): Promise<boolean> {
  try {
    // Check if user already responded
    const statusStr = await AsyncStorage.getItem(RATING_STORAGE_KEY);
    if (statusStr) {
      const status = JSON.parse(statusStr);
      
      // Never show if user rated or said never
      if (status.status === 'rated' || status.status === 'never') {
        return false;
      }
      
      // If "later", check if enough time has passed
      if (status.status === 'later') {
        const daysSince = (Date.now() - status.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSince < DAYS_BEFORE_REPROMPT) {
          return false;
        }
      }
    }

    // Check action count
    const countStr = await AsyncStorage.getItem(ACTIONS_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    
    if (count >= MIN_ACTIONS_BEFORE_PROMPT) {
      return true;
    }

    // Check install date (use first action as proxy)
    // If no actions yet, don't show
    if (count === 0) {
      return false;
    }

    return false;
  } catch (error) {
    console.error('[Rating] Failed to check rating status:', error);
    return false;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  textButton: {
    padding: 8,
  },
  textButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});