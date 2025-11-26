import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  useColorScheme,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { StorageService } from '@/services/StorageService';
import { GlassCard } from '@/components/GlassCard';
import { ActionButton } from '@/components/ActionButton';
import { FeedingModal } from '@/components/FeedingModal';
import { DiaperModal } from '@/components/DiaperModal';
import { Colors } from '@/constants/Colors';
import type {
  HandPreference,
  FeedingType,
  DiaperType,
  DailySummary,
  SleepEntry,
  BabyProfile,
  Entry,
  ActiveBreastSession,
} from '../../types';
import {
  loadPreferences,
  updatePreferences,
  subscribePreferences,
  type Preferences,
  onDataChanged,
} from '@/services/StorageService';
import { FirstTimeTutorial } from '@/components/FirstTimeTutorial';
import { RatingModal, shouldShowRatingPrompt, incrementActionCount } from '@/components/RatingModal';

const { width } = Dimensions.get('window');
const DETECTION_THRESHOLD = width * 0.4;

// Age-based feeding targets (in oz per day)
const FEEDING_TARGETS: Record<string, number> = {
  '0-1': 3,
  '1-2': 4,
  '2-3': 8,
  '3-4': 12,
  '4-7': 14,
  '7-14': 20,
  '14-28': 20,
  '28-60': 28,
  '60-90': 30,
  '90-120': 30,
  '120-150': 34,
  '150-180': 38,
};

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  // State
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [handPreference, setHandPreference] = useState<HandPreference>('right');
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [activeSleep, setActiveSleep] = useState<SleepEntry | null>(null);
  const [sleepDuration, setSleepDuration] = useState(0);
  const [activeBreast, setActiveBreast] = useState<ActiveBreastSession | null>(null);
  const [breastDuration, setBreastDuration] = useState(0);
  const [totalOz, setTotalOz] = useState(0);
  const [showFeedingModal, setShowFeedingModal] = useState(false);
  const [showDiaperModal, setShowDiaperModal] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const [prefs, setPrefs] = useState<Preferences>({
    handPreference: 'right',
    showActionLabels: true,
    units: { volume: 'imperial', weight: 'imperial' },
    darkMode: false,
    hapticFeedback: true,
  });

  const checkForRatingPrompt = async () => {
  const shouldShow = await shouldShowRatingPrompt();
  if (shouldShow) {
    // Small delay so it doesn't feel jarring
    setTimeout(() => setShowRatingModal(true), 1000);
  }
};

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(0)).current;
  const sleepTimerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const breastTimerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load preferences
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      setPrefs(await loadPreferences());
      unsub = subscribePreferences(async () => {
        setPrefs(await loadPreferences());
      });
    })();
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
  }, []);

  // Check for tutorial
  useEffect(() => {
    (async () => {
      const hasSeenTutorial = await AsyncStorage.getItem('hasSeenTutorial');
      if (!hasSeenTutorial) {
        setTimeout(() => setShowTutorial(true), 500);
      }
    })();
  }, []);

  // Refresh when data changes
  useEffect(() => {
    const unsub = onDataChanged(() => {
      loadData();
    });
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
    return () => {
      if (sleepTimerInterval.current) clearInterval(sleepTimerInterval.current);
      if (breastTimerInterval.current) clearInterval(breastTimerInterval.current);
    };
  }, []);

  // Sleep timer interval
  useEffect(() => {
    if (activeSleep?.isActive) {
      sleepTimerInterval.current = setInterval(() => {
        const duration = Math.floor((Date.now() - activeSleep.startTime) / 60000);
        setSleepDuration(duration);
      }, 1000);
    } else {
      if (sleepTimerInterval.current) {
        clearInterval(sleepTimerInterval.current);
        sleepTimerInterval.current = null;
      }
    }
    return () => {
      if (sleepTimerInterval.current) clearInterval(sleepTimerInterval.current);
    };
  }, [activeSleep]);

  // Breast timer interval
  useEffect(() => {
    if (activeBreast?.isActive) {
      breastTimerInterval.current = setInterval(() => {
        const duration = Math.floor((Date.now() - activeBreast.startTime) / 60000);
        setBreastDuration(duration);
      }, 1000);
    } else {
      if (breastTimerInterval.current) {
        clearInterval(breastTimerInterval.current);
        breastTimerInterval.current = null;
      }
    }
    return () => {
      if (breastTimerInterval.current) clearInterval(breastTimerInterval.current);
    };
  }, [activeBreast]);

  const loadData = async () => {
    await StorageService.migrateOldEntriesToFirstProfile();

    const preferences = await loadPreferences();
    setHandPreference(preferences.handPreference);

    const profile = await StorageService.getBabyProfile();
    setBabyProfile(profile);

    const today = new Date();
    const summary = await StorageService.getDailySummary(today);
    setDailySummary(summary);

    // Calculate total oz from today's feedings
    const todayStr = today.toISOString().split('T')[0];
    const entries = await StorageService.getEntriesByDate(new Date(todayStr));
    const oz = entries
      .filter((e) => e.type === 'feeding' && e.amount)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    setTotalOz(oz);

    // Get active sleep
    const sleep = await StorageService.getActiveSleep();
    setActiveSleep(sleep);
    if (sleep?.isActive) {
      const duration = Math.floor((Date.now() - sleep.startTime) / 60000);
      setSleepDuration(duration);
    }

    // Get active breast feeding
    const breast = await StorageService.getActiveBreast();
    setActiveBreast(breast);
    if (breast?.isActive) {
      const duration = Math.floor((Date.now() - breast.startTime) / 60000);
      setBreastDuration(duration);
    }
  };

  const detectHandPreference = (x: number) => {
    const newPreference: HandPreference = x < DETECTION_THRESHOLD ? 'left' : 'right';
    if (newPreference !== handPreference) {
      setHandPreference(newPreference);
      updatePreferences({ handPreference: newPreference });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.spring(buttonSlide, {
        toValue: newPreference === 'left' ? -1 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  };

  const showToast = (message: string) => {
    setLastAction(message);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setLastAction(''));
  };

  const formatVolume = (oz: number): string => {
    if (prefs.units.volume === 'imperial') {
      return `${oz.toFixed(1)}oz`;
    }
    const ml = oz * 29.5735;
    return `${ml.toFixed(0)}mL`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'Yesterday';
  };

  const getDateString = (): string => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    return now.toLocaleDateString('en-US', options);
  };

  const getDailyTarget = (): number => {
    if (!babyProfile?.dateOfBirth) return 24;
    const ageInDays = Math.floor((Date.now() - babyProfile.dateOfBirth) / (1000 * 60 * 60 * 24));

    if (ageInDays <= 1) return FEEDING_TARGETS['0-1'];
    if (ageInDays <= 2) return FEEDING_TARGETS['1-2'];
    if (ageInDays <= 3) return FEEDING_TARGETS['2-3'];
    if (ageInDays <= 4) return FEEDING_TARGETS['3-4'];
    if (ageInDays <= 7) return FEEDING_TARGETS['4-7'];
    if (ageInDays <= 14) return FEEDING_TARGETS['7-14'];
    if (ageInDays <= 28) return FEEDING_TARGETS['14-28'];
    if (ageInDays <= 60) return FEEDING_TARGETS['28-60'];
    if (ageInDays <= 90) return FEEDING_TARGETS['60-90'];
    if (ageInDays <= 120) return FEEDING_TARGETS['90-120'];
    if (ageInDays <= 150) return FEEDING_TARGETS['120-150'];
    return FEEDING_TARGETS['150-180'];
  };

  // ==================== HANDLERS ====================

  // Updated handleFeeding
const handleFeeding = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  if (activeBreast?.isActive) {
    const completed = await StorageService.stopBreastTimer();
    if (completed) {
      setActiveBreast(null);
      setBreastDuration(0);
      const sideLabel = completed.breastSide === 'left' ? 'Left' : 'Right';
      showToast(`Breast (${sideLabel}) logged: ${formatDuration(completed.duration || 0)}`);
      loadData();
      
      // Rating prompt
      await incrementActionCount();
      checkForRatingPrompt();
    }
    return;
  }

  setShowFeedingModal(true);
};

  const handleDiaper = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDiaperModal(true);
  };

  // Updated handleSleep
const handleSleep = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  if (activeSleep?.isActive) {
    const completed = await StorageService.stopSleepTimer();
    if (completed) {
      setActiveSleep(null);
      setSleepDuration(0);
      showToast(`Sleep logged: ${formatDuration(completed.duration || 0)}`);
      loadData();
      
      // Rating prompt
      await incrementActionCount();
      checkForRatingPrompt();
    }
  } else {
    const newSleep = await StorageService.startSleepTimer();
    setActiveSleep(newSleep);
    showToast('Sleep timer started');
  }
};

// Bottle feeding save handler
const saveBottleEntry = async (feedingType: FeedingType, amount: number) => {
  const entry: Entry = {
    id: `feeding_${Date.now()}`,
    type: 'feeding',
    timestamp: Date.now(),
    feedingType,
    amount,
    isActive: false,
  };

  await StorageService.saveEntry(entry);
  showToast(`Bottle logged: ${formatVolume(amount)}`);
  loadData();
  
  // Rating prompt
  await incrementActionCount();
  checkForRatingPrompt();
};

  // Breast feeding start handler
  const startBreastFeeding = async (side: 'left' | 'right') => {
    const session = await StorageService.startBreastTimer(side);
    setActiveBreast(session);
    const sideLabel = side === 'left' ? 'Left' : 'Right';
    showToast(`Breast feeding started (${sideLabel})`);
  };

// Diaper save handler
const saveDiaperEntry = async (diaperType: DiaperType) => {
  const entry: Entry = {
    id: `diaper_${Date.now()}`,
    type: 'diaper',
    timestamp: Date.now(),
    diaperType,
    isActive: false,
  };

  await StorageService.saveEntry(entry);
  const typeLabel =
    diaperType === 'both' ? 'Wet & Dirty' : diaperType === 'wet' ? 'Wet' : 'Dirty';
  showToast(`${typeLabel} diaper logged`);
  loadData();
  
  // Rating prompt
  await incrementActionCount();
  checkForRatingPrompt();
};

  const handleTutorialDismiss = async () => {
    await AsyncStorage.setItem('hasSeenTutorial', 'true');
    setShowTutorial(false);
  };

  // ==================== RENDER ====================

  const buttonPosition = handPreference === 'right' ? { right: 20 } : { left: 20 };
  const dailyTarget = getDailyTarget();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => detectHandPreference(e.nativeEvent.pageX)}
    >
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(107, 127, 215, 0.15)', 'rgba(107, 127, 215, 0.05)', 'rgba(0, 0, 0, 0)']
            : ['rgba(107, 127, 215, 0.08)', 'rgba(107, 127, 215, 0.03)', 'rgba(0, 0, 0, 0)']
        }
        style={[styles.gradientBackground, { paddingTop: insets.top }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {babyProfile?.name || 'Track'}
            </Text>
            <Text style={[styles.headerDate, { color: colors.textSecondary }]}>
              {getDateString()}
            </Text>
          </View>
          <View style={styles.headerButtons}>

            <TouchableOpacity
    style={styles.headerButton}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/explore');  // ← Summary screen
    }}
  >
    <View style={[styles.iconOutline, { borderColor: colors.textSecondary }]}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={colors.textSecondary} />
    </View>
  </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('../analytics'); 
              }}
            >
              <View style={[styles.iconOutline, { borderColor: colors.textSecondary }]}>
                <MaterialCommunityIcons name="chart-line" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings');
              }}
            >
              <View style={[styles.iconOutline, { borderColor: colors.textSecondary }]}>
                <MaterialCommunityIcons name="cog-outline" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <ScrollView
          style={styles.summaryContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 200 }}
        >
          {/* Active Breast Feeding Card */}
          {activeBreast?.isActive && (
            <GlassCard style={StyleSheet.flatten([styles.summaryCard, { borderColor: colors.feeding.primary, borderWidth: 2 }])}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Breast Feeding ({activeBreast.side === 'left' ? 'Left' : 'Right'})
                  </Text>
                  <Text style={[styles.timerText, { color: colors.feeding.primary }]}>
                    {formatDuration(breastDuration)}
                  </Text>
                  <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>
                    Tap STOP to finish
                  </Text>
                </View>
                <View style={[styles.activeIndicator, { backgroundColor: colors.feeding.primary }]} />
              </View>
            </GlassCard>
          )}

          {/* Feeding Summary Card */}
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Last Feeding
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {dailySummary?.lastFeeding
                    ? formatTimeAgo(dailySummary.lastFeeding)
                    : 'None today'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Today</Text>
                <Text style={[styles.summaryValue, { color: colors.feeding.primary }]}>
                  {dailySummary?.totalFeedings || 0}
                </Text>
                <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>
                  {prefs.units.volume === 'imperial'
                    ? `${totalOz.toFixed(1)}oz / ${dailyTarget}oz`
                    : `${(totalOz * 29.5735).toFixed(0)}mL / ${(dailyTarget * 29.5735).toFixed(0)}mL`}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Sleep Summary Card */}
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Sleep Today
                </Text>
                {activeSleep?.isActive ? (
                  <>
                    <Text style={[styles.timerText, { color: colors.sleep.primary }]}>
                      {formatDuration(sleepDuration)}
                    </Text>
                    <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>
                      Running...
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatDuration(dailySummary?.totalSleep || 0)}
                  </Text>
                )}
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.summaryValue, { color: colors.sleep.primary }]}>
                  {activeSleep?.isActive ? 'Sleeping' : 'Awake'}
                </Text>
                {activeSleep?.isActive && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.sleep.primary }]} />
                )}
              </View>
            </View>
          </GlassCard>

          {/* Diaper Summary Card */}
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Last Change
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {dailySummary?.lastDiaper
                    ? formatTimeAgo(dailySummary.lastDiaper)
                    : 'None today'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Diapers</Text>
                <Text style={[styles.summaryValue, { color: colors.diaper.primary }]}>
                  {dailySummary?.totalDiapers || 0}
                </Text>
              </View>
            </View>
          </GlassCard>
        </ScrollView>

        {/* Toast Notification */}
        {lastAction !== '' && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: fadeAnim,
                backgroundColor: colors.success,
              },
            ]}
          >
            <Text style={styles.toastText}>✓ {lastAction}</Text>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={[styles.actionButtonsContainer, buttonPosition, { bottom: insets.bottom + 24 }]}>
          <ActionButton
            label={activeBreast?.isActive ? 'STOP' : 'FEED'}
            icon={activeBreast?.isActive ? 'stop' : 'baby-bottle-outline'}
            color={colors.feeding.primary}
            onPress={handleFeeding}
            isActive={!!activeBreast?.isActive}
            showLabel={prefs.showActionLabels}
          />

          <ActionButton
            label={activeSleep?.isActive ? 'WAKE' : 'SLEEP'}
            icon={activeSleep?.isActive ? 'white-balance-sunny' : 'sleep'}
            color={colors.sleep.primary}
            onPress={handleSleep}
            isActive={!!activeSleep?.isActive}
            showLabel={prefs.showActionLabels}
          />

          <ActionButton
            label="DIAPER"
            icon="human-baby-changing-table"
            color={colors.diaper.primary}
            onPress={handleDiaper}
            showLabel={prefs.showActionLabels}
          />
        </View>
      </LinearGradient>

      {/* Modals */}
      <FeedingModal
        visible={showFeedingModal}
        onClose={() => setShowFeedingModal(false)}
        onSaveBottle={saveBottleEntry}
        onStartBreast={startBreastFeeding}
      />
      <DiaperModal
        visible={showDiaperModal}
        onClose={() => setShowDiaperModal(false)}
        onSave={saveDiaperEntry}
      />

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      />

      {/* Tutorial overlay */}
      <FirstTimeTutorial visible={showTutorial} onDismiss={handleTutorialDismiss} />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 17,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOutline: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    paddingHorizontal: 20,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    position: 'relative',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summarySubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginHorizontal: 16,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButtonsContainer: {
    position: 'absolute',
    gap: 16,
  },
  toast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});