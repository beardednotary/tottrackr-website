// app/(tabs)/explore.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StorageService, onDataChanged, loadPreferences } from '@/services/StorageService';
import { GlassCard } from '@/components/GlassCard';
import { Colors } from '@/constants/Colors';
import type { Entry, DailySummary } from '@/types';
import { useRouter } from 'expo-router';

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [volumeUnit, setVolumeUnit] = useState<'imperial' | 'metric'>('imperial');

  useEffect(() => {
    loadData();
    
    // Subscribe to data changes
    const unsub = onDataChanged(() => {
      loadData();
    });

    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get preferences for units
      const prefs = await loadPreferences();
      setVolumeUnit(prefs.units.volume);

      // Get today's summary
      const today = new Date();
      const summary = await StorageService.getDailySummary(today);
      setDailySummary(summary);

      // Get recent entries (last 50)
      const allEntries = await StorageService.getEntries();
      const sorted = allEntries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
      setEntries(sorted);
    } catch (error) {
      console.error('[Summary] Load failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatVolume = (oz: number): string => {
    if (volumeUnit === 'imperial') {
      return `${oz.toFixed(1)} oz`;
    }
    const ml = oz * 29.5735;
    return `${ml.toFixed(0)} mL`;
  };

  const getEntryIcon = (entry: Entry): string => {
    if (entry.type === 'feeding') {
      return entry.feedingType === 'breast' ? 'heart' : 'baby-bottle-outline';
    } else if (entry.type === 'sleep') {
      return 'sleep';
    } else if (entry.type === 'diaper') {
      return 'human-baby-changing-table';
    }
    return 'circle';
  };

  const getEntryColor = (entry: Entry): string => {
    if (entry.type === 'feeding') return colors.feeding.primary;
    if (entry.type === 'sleep') return colors.sleep.primary;
    if (entry.type === 'diaper') return colors.diaper.primary;
    return colors.text;
  };

  const getEntryDescription = (entry: Entry): string => {
    if (entry.type === 'feeding') {
      if (entry.feedingType === 'breast') {
        const side = entry.breastSide === 'left' ? 'Left' : 'Right';
        const duration = entry.duration ? ` • ${entry.duration}m` : '';
        return `Breast (${side})${duration}`;
      } else {
        return `Bottle • ${formatVolume(entry.amount || 0)}`;
      }
    } else if (entry.type === 'sleep') {
      return `Sleep • ${formatDuration(entry.duration || 0)}`;
    } else if (entry.type === 'diaper') {
      const type = entry.diaperType === 'both' 
        ? 'Wet & Dirty' 
        : entry.diaperType === 'wet' 
        ? 'Wet' 
        : 'Dirty';
      return `Diaper • ${type}`;
    }
    return '';
  };

  // Group entries by date
  const groupedEntries: { [key: string]: Entry[] } = {};
  entries.forEach(entry => {
    const dateKey = formatDate(entry.timestamp);
    if (!groupedEntries[dateKey]) {
      groupedEntries[dateKey] = [];
    }
    groupedEntries[dateKey].push(entry);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    <Text style={[styles.headerTitle, { color: colors.text }]}>Summary</Text>
  </View>
  
  <View style={{ width: 44 }} />
</View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Today's Summary */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today</Text>
            
            <View style={styles.summaryGrid}>
              <GlassCard style={styles.summaryCard}>
                <MaterialCommunityIcons 
                  name="baby-bottle-outline" 
                  size={28} 
                  color={colors.feeding.primary} 
                />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {dailySummary?.totalFeedings || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Feedings
                </Text>
              </GlassCard>

              <GlassCard style={styles.summaryCard}>
                <MaterialCommunityIcons 
                  name="sleep" 
                  size={28} 
                  color={colors.sleep.primary} 
                />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {dailySummary?.totalSleep ? formatDuration(dailySummary.totalSleep) : '0m'}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Sleep
                </Text>
              </GlassCard>

              <GlassCard style={styles.summaryCard}>
                <MaterialCommunityIcons 
                  name="human-baby-changing-table" 
                  size={28} 
                  color={colors.diaper.primary} 
                />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {dailySummary?.totalDiapers || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Diapers
                </Text>
              </GlassCard>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>

            {entries.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <MaterialCommunityIcons 
                  name="clipboard-text-outline" 
                  size={48} 
                  color={colors.textSecondary} 
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No entries yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Start tracking to see your history here
                </Text>
              </GlassCard>
            ) : (
              Object.keys(groupedEntries).map(dateKey => (
                <View key={dateKey}>
                  <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>
                    {dateKey}
                  </Text>
                  {groupedEntries[dateKey].map(entry => (
                    <GlassCard key={entry.id} style={styles.entryCard}>
                      <View style={styles.entryContent}>
                        <View 
                          style={[
                            styles.entryIcon,
                            { backgroundColor: getEntryColor(entry) + '20' }
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={getEntryIcon(entry) as any}
                            size={20}
                            color={getEntryColor(entry)}
                          />
                        </View>
                        
                        <View style={styles.entryDetails}>
                          <Text style={[styles.entryDescription, { color: colors.text }]}>
                            {getEntryDescription(entry)}
                          </Text>
                          <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                            {formatTime(entry.timestamp)}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
  fontSize: 40,
  fontWeight: '700',
  letterSpacing: -1,
},
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  entryCard: {
    marginBottom: 12,
    padding: 16,
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryDetails: {
    flex: 1,
  },
  entryDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  entryTime: {
    fontSize: 13,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});