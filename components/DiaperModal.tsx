import React, { useState } from 'react';
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
import type { DiaperType } from '@/types';
import * as Haptics from 'expo-haptics';

interface DiaperModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (type: DiaperType) => void;
}

export function DiaperModal({ visible, onClose, onSave }: DiaperModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [diaperType, setDiaperType] = useState<DiaperType>('wet');
  const [prefs, setPrefs] = useState<Preferences>({
    handPreference: 'right',
    showActionLabels: true,
    units: { volume: 'imperial', weight: 'imperial' },
    darkMode: false,
    hapticFeedback: true,
  });

  React.useEffect(() => {
    (async () => {
      setPrefs(await loadPreferences());
    })();
  }, [visible]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(diaperType);
    onClose();
    // Reset for next time
    setTimeout(() => setDiaperType('wet'), 300);
  };

  const handleSelect = (type: DiaperType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDiaperType(type);
  };

  // Position based on hand preference
  const isLeftHanded = prefs.handPreference === 'left';
  const modalPosition = {
    bottom: 120,
    [isLeftHanded ? 'left' : 'right']: 20,
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
            { backgroundColor: colors.background }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.diaper.primary }]}>
              <MaterialCommunityIcons 
                name="human-baby-changing-table" 
                size={18} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Log Diaper</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons 
                name="close" 
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {/* Diaper Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              TYPE
            </Text>
            
            <TouchableOpacity
              style={[
                styles.typeCard,
                diaperType === 'wet' && { 
                  backgroundColor: colors.diaper.primary,
                  borderColor: colors.diaper.primary,
                },
                { borderColor: colors.border }
              ]}
              onPress={() => handleSelect('wet')}
            >
              <View style={styles.typeContent}>
                <View style={[
                  styles.typeIcon,
                  { backgroundColor: diaperType === 'wet' 
                      ? 'rgba(255,255,255,0.2)' 
                      : colors.backgroundSecondary 
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name="water" 
                    size={20} 
                    color={diaperType === 'wet' ? '#FFFFFF' : colors.diaper.primary} 
                  />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={[
                    styles.typeTitle,
                    { color: diaperType === 'wet' ? '#FFFFFF' : colors.text }
                  ]}>
                    Wet
                  </Text>
                  <Text style={[
                    styles.typeSubtitle,
                    { color: diaperType === 'wet' 
                        ? 'rgba(255,255,255,0.8)' 
                        : colors.textSecondary 
                    }
                  ]}>
                    Pee only
                  </Text>
                </View>
                {diaperType === 'wet' && (
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeCard,
                diaperType === 'dirty' && { 
                  backgroundColor: colors.diaper.primary,
                  borderColor: colors.diaper.primary,
                },
                { borderColor: colors.border }
              ]}
              onPress={() => handleSelect('dirty')}
            >
              <View style={styles.typeContent}>
                <View style={[
                  styles.typeIcon,
                  { backgroundColor: diaperType === 'dirty' 
                      ? 'rgba(255,255,255,0.2)' 
                      : colors.backgroundSecondary 
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name="alert-circle" 
                    size={20} 
                    color={diaperType === 'dirty' ? '#FFFFFF' : colors.diaper.primary} 
                  />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={[
                    styles.typeTitle,
                    { color: diaperType === 'dirty' ? '#FFFFFF' : colors.text }
                  ]}>
                    Dirty
                  </Text>
                  <Text style={[
                    styles.typeSubtitle,
                    { color: diaperType === 'dirty' 
                        ? 'rgba(255,255,255,0.8)' 
                        : colors.textSecondary 
                    }
                  ]}>
                    Poop only
                  </Text>
                </View>
                {diaperType === 'dirty' && (
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeCard,
                diaperType === 'both' && { 
                  backgroundColor: colors.diaper.primary,
                  borderColor: colors.diaper.primary,
                },
                { borderColor: colors.border }
              ]}
              onPress={() => handleSelect('both')}
            >
              <View style={styles.typeContent}>
                <View style={[
                  styles.typeIcon,
                  { backgroundColor: diaperType === 'both' 
                      ? 'rgba(255,255,255,0.2)' 
                      : colors.backgroundSecondary 
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name="alert-circle-check" 
                    size={20} 
                    color={diaperType === 'both' ? '#FFFFFF' : colors.diaper.primary} 
                  />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={[
                    styles.typeTitle,
                    { color: diaperType === 'both' ? '#FFFFFF' : colors.text }
                  ]}>
                    Both
                  </Text>
                  <Text style={[
                    styles.typeSubtitle,
                    { color: diaperType === 'both' 
                        ? 'rgba(255,255,255,0.8)' 
                        : colors.textSecondary 
                    }
                  ]}>
                    Wet & dirty
                  </Text>
                </View>
                {diaperType === 'both' && (
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.diaper.primary }]}
            onPress={handleSave}
          >
            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Diaper</Text>
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
  typeCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
  },
  typeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  typeSubtitle: {
    fontSize: 12,
    fontWeight: '500',
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