import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { ShareTotTrackr } from '@/components/ShareTotTrackr';

import { StorageService } from '@/services/StorageService';
import {
  loadPreferences,
  updatePreferences,
  getVolumeUnitLabel,
  getWeightUnitLabel,
  type Preferences,
} from '@/services/StorageService';

import { GlassCard } from '@/components/GlassCard';
import { Colors } from '@/constants/Colors';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataExportService } from '@/services/DataExportService';
import type { BabyProfile, WeightEntry } from '@/types';
import { usePremium } from '../../contexts/PremiumContext';
import { PremiumGate } from '@/components/PremiumGate';
import { PDFExportService } from '@/services/PDFExportService';
import { PremiumBadge } from '@/components/PremiumGate';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const colors = Colors[colorScheme ?? 'light'];

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [birthWeight, setBirthWeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { isPremium, setPremium } = usePremium();

  const handleExportPDF = async () => {
  setIsExporting(true);
  
  try {
    // Export last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const success = await PDFExportService.generateAndShare({
      startDate,
      endDate,
      babyProfile: babyProfile, // Your baby profile state
    });

    if (success) {
      Alert.alert('Success!', 'PDF report generated and ready to share!');
    } else {
      Alert.alert('Oops', 'Unable to share PDF. It may have been saved to your device.');
    }
  } catch (error) {
    Alert.alert('Export Failed', 'Something went wrong. Please try again.');
  } finally {
    setIsExporting(false);
  }
};


  // Preferences state
  const [prefs, setPrefs] = useState<Preferences>({
    handPreference: 'right',
    showActionLabels: true,
    units: { volume: 'imperial', weight: 'imperial' },
    darkMode: false,
    hapticFeedback: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const getWeightLabel = () => {
    return prefs.units.weight === 'imperial' ? 'lbs' : 'kg';
  };

  const convertWeightForDisplay = (lbs: number) => {
    if (prefs.units.weight === 'metric') {
      return (lbs * 0.453592).toFixed(2);
    }
    return lbs.toFixed(2);
  };

  const loadData = async () => {
  // Baby profile + weights
  const profile = await StorageService.getBabyProfile();
  if (profile) {
    setBabyProfile(profile);
    setName(profile.name);
    setDateOfBirth(new Date(profile.dateOfBirth));
    setBirthWeight(profile.birthWeight?.toString() || '');
  }

  // ✅ FIX: Get weights and sort by newest first
  const weights = await StorageService.getWeightEntries();
  const sortedWeights = weights.sort((a, b) => b.timestamp - a.timestamp);
  setWeightEntries(sortedWeights);

  // Preferences
  const loadedPrefs = await loadPreferences();
  setPrefs(loadedPrefs);
};

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', "Please enter baby's name");
      return;
    }

    const profile: BabyProfile = {
      id: babyProfile?.id || Date.now().toString(),
      name: name.trim(),
      dateOfBirth: dateOfBirth.getTime(),
      birthWeight: birthWeight ? parseFloat(birthWeight) : undefined,
      createdAt: babyProfile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await StorageService.saveBabyProfile(profile);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Profile saved!');
    loadData();
  };

  const handleAddWeight = async () => {
    if (!currentWeight) {
      Alert.alert('Error', 'Please enter weight');
      return;
    }

    const weight = parseFloat(currentWeight);
    
    const weightEntry: WeightEntry = {
      id: Date.now().toString(),
      weight,
      timestamp: Date.now(),
      date: Date.now(),
      babyId: babyProfile?.id || 'default', 
    };

    await StorageService.saveWeightEntry(weightEntry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Weight recorded!');
    setCurrentWeight('');
    loadData();
  };

  const handleExport = async () => {
    Alert.alert(
      'Export Format',
      'Choose export format for the last 30 days',
      [
        {
          text: 'CSV (Spreadsheet)',
          onPress: async () => {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            
            await DataExportService.exportData(startDate, endDate, 'csv');
          },
        },
        {
          text: 'Text (Readable)',
          onPress: async () => {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            
            await DataExportService.exportData(startDate, endDate, 'text');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

const setShowLabels = async (val: boolean) => {
  Haptics.selectionAsync();
  await updatePreferences({ showActionLabels: val });
  setPrefs(await loadPreferences());  // Load fresh preferences
};

const setVolumeUnits = async (sys: 'imperial' | 'metric') => {
  Haptics.selectionAsync();
  await updatePreferences({ units: { ...prefs.units, volume: sys } });
  setPrefs(await loadPreferences());
};

const setWeightUnits = async (sys: 'imperial' | 'metric') => {
  Haptics.selectionAsync();
  await updatePreferences({ units: { ...prefs.units, weight: sys } });
  setPrefs(await loadPreferences());
};

  const getAgeString = (): string => {
    if (!babyProfile) return '';
    const ageMs = Date.now() - babyProfile.dateOfBirth;
    const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (days < 30) return `${days} days old`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months old`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} old`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(107, 158, 255, 0.15)', 'rgba(107, 158, 255, 0.05)', 'rgba(0, 0, 0, 0)']
            : ['rgba(107, 158, 255, 0.08)', 'rgba(107, 158, 255, 0.03)', 'rgba(0, 0, 0, 0)']
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          </View>
          
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Baby Profile Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Baby Profile</Text>

            <GlassCard style={styles.card}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Baby's name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text
                style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}
              >
                Date of Birth
              </Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: colors.text }}>
                  {dateOfBirth.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {babyProfile && (
                <Text style={[styles.ageText, { color: colors.textSecondary }]}>
                  {getAgeString()}
                </Text>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setDateOfBirth(date);
                  }}
                />
              )}

              <Text
                style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}
              >
                Birth Weight ({getWeightLabel()})
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={birthWeight}
                onChangeText={setBirthWeight}
                placeholder="0.0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>

          {/* Weight Tracking Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weight Tracking</Text>

            <GlassCard style={styles.card}>
              <Text
                style={[styles.label, { color: colors.textSecondary }]}
              >
                Current Weight ({getWeightLabel()})
              </Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.weightInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  placeholder="0.0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.tint }]}
                  onPress={handleAddWeight}
                >
                  <Text style={styles.addButtonText}>Log</Text>
                </TouchableOpacity>
              </View>

              {/* Weight History */}
              {weightEntries.length > 0 && (
                <View style={styles.weightHistory}>
                  <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>
                    Recent Weights
                  </Text>
                  {weightEntries.slice(0, 5).map((entry) => (
                    <View key={entry.id} style={styles.weightEntry}>
                      <Text style={{ color: colors.text }}>
                        {convertWeightForDisplay(entry.weight)} {getWeightLabel()}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>

            <GlassCard style={styles.card}>
              {/* Show Action Labels */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Show action labels</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Display "Feed", "Diaper", "Sleep" text on buttons
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowLabels(!prefs.showActionLabels)}
                  style={[
                    styles.pill,
                    {
                      borderColor: prefs.showActionLabels ? colors.tint : colors.border,
                      backgroundColor: prefs.showActionLabels ? colors.tint : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: prefs.showActionLabels ? '#fff' : colors.text,
                      fontWeight: '700',
                    }}
                  >
                    {prefs.showActionLabels ? 'On' : 'Off'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feeding volume units */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Feeding volume units</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Current: {getVolumeUnitLabel(prefs)}
                  </Text>
                </View>
                <View style={styles.segmentWrap}>
                  <Segment
                    label="oz"
                    active={prefs.units.volume === 'imperial'}
                    onPress={() => setVolumeUnits('imperial')}
                    colors={colors}
                  />
                  <Segment
                    label="mL"
                    active={prefs.units.volume === 'metric'}
                    onPress={() => setVolumeUnits('metric')}
                    colors={colors}
                  />
                </View>
              </View>

              {/* Baby weight units */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Baby weight units</Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Current: {getWeightUnitLabel(prefs)}
                  </Text>
                </View>
                <View style={styles.segmentWrap}>
                  <Segment
                    label="lbs"
                    active={prefs.units.weight === 'imperial'}
                    onPress={() => setWeightUnits('imperial')}
                    colors={colors}
                  />
                  <Segment
                    label="kg"
                    active={prefs.units.weight === 'metric'}
                    onPress={() => setWeightUnits('metric')}
                    colors={colors}
                  />
                </View>
              </View>
            </GlassCard>
          </View>

          {/* Premium Section */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Upgrade</Text>
  
  <GlassCard style={styles.card}>
    <TouchableOpacity
      style={styles.premiumButton}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('../premium');
      }}
    >
      <View style={styles.premiumContent}>
        <View style={[styles.premiumIcon, { backgroundColor: colors.tint }]}>
          <MaterialCommunityIcons name="crown" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.premiumText}>
          <Text style={[styles.premiumTitle, { color: colors.text }]}>
            Unlock Premium
          </Text>
          <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
            Multi-device sync, unlimited history, and more
          </Text>
        </View>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color={colors.textSecondary} 
        />
      </View>
    </TouchableOpacity>
  </GlassCard>
</View>

{/* Baby Profiles Section */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>
    Baby Profiles <PremiumBadge />
  </Text>
  
  <GlassCard style={styles.card}>
    <TouchableOpacity
      style={styles.premiumButton}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/profiles');
      }}
    >
      <View style={styles.premiumContent}>
        <View style={[styles.premiumIcon, { backgroundColor: colors.tint }]}>
          <MaterialCommunityIcons name="account-multiple" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.premiumText}>
          <Text style={[styles.premiumTitle, { color: colors.text }]}>
            Manage Babies
          </Text>
          <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
            Track multiple children with separate profiles
          </Text>
        </View>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color={colors.textSecondary} 
        />
      </View>
    </TouchableOpacity>
  </GlassCard>
</View>

{/* Export Section */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Export</Text>

  <PremiumGate feature="PDF Export">
    <GlassCard style={styles.card}>
      <View style={styles.exportSection}>
        <MaterialCommunityIcons 
          name="file-pdf-box" 
          size={48} 
          color={colors.tint} 
        />
        <Text style={[styles.exportTitle, { color: colors.text }]}>
          Export to PDF
        </Text>
        <Text style={[styles.exportDescription, { color: colors.textSecondary }]}>
          Generate a beautiful PDF report to share with your pediatrician or for your records.
        </Text>

        <TouchableOpacity
          style={[
            styles.exportButton,
            { backgroundColor: colors.tint },
            isExporting && { opacity: 0.6 },
          ]}
          onPress={handleExportPDF}
          disabled={isExporting}
        >
          <MaterialCommunityIcons 
            name={isExporting ? "loading" : "file-pdf-box"} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.exportButtonText}>
            {isExporting ? 'Generating...' : 'Export Last 30 Days'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.exportNote, { color: colors.textSecondary }]}>
          Includes feeding, sleep, diaper data, and weight tracking
        </Text>
      </View>
    </GlassCard>
  </PremiumGate>
</View>

          {/* Reference Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Feeding Guidelines</Text>
            <GlassCard style={styles.card}>
              <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>
                Age-based feeding recommendations are shown on the Track screen based on your baby's date of birth.
              </Text>
              <Text
                style={[
                  styles.guidelineText,
                  { color: colors.textSecondary, marginTop: 12 },
                ]}
              >
                💡 These are general guidelines. Always consult your pediatrician for personalized advice.
              </Text>
            </GlassCard>
          </View>
          {/* Share TotTrackr Section */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Spread the Word</Text>
  <ShareTotTrackr />
</View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

/* Local helper: segmented button */
function Segment({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.segment,
        {
          backgroundColor: active ? colors.tint : 'transparent',
          borderColor: active ? colors.tint : colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBackground: { flex: 1 },

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
  backIcon: { fontSize: 28, fontWeight: '300' },
  headerCenter: { 
    alignItems: 'center', 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 40, 
    fontWeight: '700', 
    letterSpacing: -1 
  },

  content: { paddingHorizontal: 20 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, paddingHorizontal: 4 },

  card: { padding: 20 },

  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  ageText: { fontSize: 14, marginTop: 8, fontStyle: 'italic' },

  saveButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  weightInputRow: { flexDirection: 'row', gap: 12 },
  weightInput: { flex: 1 },
  addButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  weightHistory: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  weightEntry: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },

  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },

  // Preferences styles
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSubtitle: { fontSize: 13, marginTop: 2 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  segmentWrap: { flexDirection: 'row', gap: 8 },
  segment: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },

  guidelineText: { fontSize: 14, lineHeight: 20 },

  premiumButton: {
  padding: 0,
},
premiumContent: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 16,
},
premiumIcon: {
  width: 48,
  height: 48,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},
premiumText: {
  flex: 1,
},
premiumTitle: {
  fontSize: 17,
  fontWeight: '700',
  marginBottom: 2,
},
premiumSubtitle: {
  fontSize: 13,
  lineHeight: 18,
},
exportSection: {
  alignItems: 'center',
  padding: 20,
},
exportTitle: {
  fontSize: 20,
  fontWeight: '700',
  marginTop: 16,
  marginBottom: 8,
  textAlign: 'center',
},
exportDescription: {
  fontSize: 14,
  lineHeight: 20,
  textAlign: 'center',
  marginBottom: 20,
},
exportButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 24,
  paddingVertical: 14,
  borderRadius: 12,
  marginBottom: 12,
},
exportButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},
exportNote: {
  fontSize: 12,
  textAlign: 'center',
  fontStyle: 'italic',
},
});