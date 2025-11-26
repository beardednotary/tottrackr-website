import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { loadPreferences, type Preferences } from '@/services/StorageService';
import type { FeedingType } from '@/types';
import * as Haptics from 'expo-haptics';

interface FeedingModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveBottle: (type: FeedingType, amount: number) => void;
  onStartBreast: (side: 'left' | 'right') => void;
}

export function FeedingModal({ 
  visible, 
  onClose, 
  onSaveBottle,
  onStartBreast,
}: FeedingModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // State
  const [feedingType, setFeedingType] = useState<'bottle' | 'breast'>('bottle');
  const [amount, setAmount] = useState<number>(4); // Always stored in oz internally
  const [breastSide, setBreastSide] = useState<'left' | 'right'>('left');
  const [prefs, setPrefs] = useState<Preferences>({
    handPreference: 'right',
    showActionLabels: true,
    units: { volume: 'imperial', weight: 'imperial' },
    darkMode: false,
    hapticFeedback: true,
  });

  // Load preferences when modal opens
  useEffect(() => {
    if (visible) {
      (async () => {
        setPrefs(await loadPreferences());
      })();
    }
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setFeedingType('bottle');
        setAmount(4);
        setBreastSide('left');
      }, 300);
    }
  }, [visible]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (feedingType === 'breast') {
      // Start persistent breast timer and close modal
      onStartBreast(breastSide);
    } else {
      // Save bottle feeding immediately
      onSaveBottle('formula', amount);
    }

    onClose();
  };

  const incrementAmount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount((prev) => Math.min(prev + 0.5, 20));
  };

  const decrementAmount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount((prev) => Math.max(prev - 0.5, 0.5));
  };

  const selectQuickAmount = (quickAmount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(quickAmount);
  };

  // Position based on hand preference
  const isLeftHanded = prefs.handPreference === 'left';
  const modalPosition = {
    bottom: 120,
    [isLeftHanded ? 'left' : 'right']: 20,
  };

  // Unit handling
  const isMetric = prefs.units.volume === 'metric';
  const unitLabel = isMetric ? 'mL' : 'oz';

  // Display amount (convert oz to mL for display if metric)
  const displayAmount = isMetric
    ? Math.round(amount * 29.5735).toString()
    : amount.toFixed(1);

  // Quick amount presets - different values for oz vs mL
  const quickPresets = isMetric
    ? [60, 120, 180, 240] // mL values
    : [2, 4, 6, 8]; // oz values

  // Get the internal oz value for a preset
  const getPresetOzValue = (preset: number): number => {
    return isMetric ? preset / 29.5735 : preset;
  };

  // Check if current amount matches a preset
  const isPresetSelected = (preset: number): boolean => {
    const presetOz = getPresetOzValue(preset);
    return Math.abs(amount - presetOz) < 0.1;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.modal,
            modalPosition,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.feeding.primary },
              ]}
            >
              <MaterialCommunityIcons
                name="baby-bottle"
                size={18}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Log Feeding
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Feeding Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              TYPE
            </Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  feedingType === 'bottle' && {
                    backgroundColor: colors.feeding.primary,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFeedingType('bottle');
                }}
              >
                <MaterialCommunityIcons
                  name="baby-bottle-outline"
                  size={16}
                  color={feedingType === 'bottle' ? '#FFFFFF' : colors.text}
                />
                <Text
                  style={[
                    styles.typeText,
                    { color: feedingType === 'bottle' ? '#FFFFFF' : colors.text },
                  ]}
                >
                  Bottle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  feedingType === 'breast' && {
                    backgroundColor: colors.feeding.primary,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFeedingType('breast');
                }}
              >
                <MaterialCommunityIcons
                  name="heart"
                  size={16}
                  color={feedingType === 'breast' ? '#FFFFFF' : colors.text}
                />
                <Text
                  style={[
                    styles.typeText,
                    { color: feedingType === 'breast' ? '#FFFFFF' : colors.text },
                  ]}
                >
                  Breast
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BOTTLE: Amount Selection */}
          {feedingType === 'bottle' && (
            <>
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  AMOUNT
                </Text>
                <View style={styles.amountRow}>
                  <TouchableOpacity
                    style={[
                      styles.amountButton,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                    onPress={decrementAmount}
                  >
                    <MaterialCommunityIcons
                      name="minus"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.amountDisplay,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <Text style={[styles.amountText, { color: colors.text }]}>
                      {displayAmount}
                    </Text>
                    <Text
                      style={[styles.unitText, { color: colors.textSecondary }]}
                    >
                      {unitLabel}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.amountButton,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                    onPress={incrementAmount}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmounts}>
                {quickPresets.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.quickButton,
                      isPresetSelected(preset) && {
                        backgroundColor: colors.feeding.primary,
                      },
                      { borderColor: colors.border },
                    ]}
                    onPress={() => selectQuickAmount(getPresetOzValue(preset))}
                  >
                    <Text
                      style={[
                        styles.quickText,
                        {
                          color: isPresetSelected(preset)
                            ? '#FFFFFF'
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* BREAST: Side Selection Only */}
          {feedingType === 'breast' && (
            <>
              {/* Side Selection */}
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  SIDE
                </Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      breastSide === 'left' && {
                        backgroundColor: colors.feeding.primary,
                      },
                      { borderColor: colors.border },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBreastSide('left');
                    }}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={16}
                      color={breastSide === 'left' ? '#FFFFFF' : colors.text}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        { color: breastSide === 'left' ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      Left
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      breastSide === 'right' && {
                        backgroundColor: colors.feeding.primary,
                      },
                      { borderColor: colors.border },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBreastSide('right');
                    }}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: breastSide === 'right' ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      Right
                    </Text>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={16}
                      color={breastSide === 'right' ? '#FFFFFF' : colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info text */}
              <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Timer will start and run in background. Tap FEED again to stop.
                </Text>
              </View>
            </>
          )}

          {/* Save/Start Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.feeding.primary },
            ]}
            onPress={handleSave}
          >
            <MaterialCommunityIcons 
              name={feedingType === 'breast' ? 'play' : 'check'} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.saveButtonText}>
              {feedingType === 'breast' ? 'Start Timer' : 'Save Feeding'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    position: 'absolute',
    width: 280,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountDisplay: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  quickButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});