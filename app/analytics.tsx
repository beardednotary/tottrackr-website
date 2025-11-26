// app/analytics.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import { StorageService } from '@/services/StorageService';
import { GlassCard } from '@/components/GlassCard';
import { Colors } from '@/constants/Colors';
import { PremiumGate } from '@/components/PremiumGate';
import type { Entry } from '@/types';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80;

type TimeRange = '7d' | '14d' | '30d';

interface DayData {
  date: string;
  feedings: number;
  feedingOz: number;
  sleepMinutes: number;
  diapers: number;
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [dailyData, setDailyData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(timeRange);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all entries
      const allEntries = await StorageService.getEntries();
      const entries = allEntries.filter(e => {
        const entryDate = new Date(e.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });

      // Group by day
      const dayMap = new Map<string, DayData>();
      
      // Initialize all days in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateShort(d);
        dayMap.set(dateStr, {
          date: dateStr,
          feedings: 0,
          feedingOz: 0,
          sleepMinutes: 0,
          diapers: 0,
        });
      }

      // Fill with data
      entries.forEach(entry => {
        const dateStr = formatDateShort(new Date(entry.timestamp));
        const day = dayMap.get(dateStr);
        
        if (day) {
          if (entry.type === 'feeding') {
            day.feedings++;
            day.feedingOz += entry.amount || 0;
          } else if (entry.type === 'sleep') {
            day.sleepMinutes += entry.duration || 0;
          } else if (entry.type === 'diaper') {
            day.diapers++;
          }
        }
      });

      setDailyData(Array.from(dayMap.values()));
    } catch (error) {
      console.error('[Analytics] Load failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateShort = (date: Date): string => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Prepare chart data
  const feedingChartData = dailyData.map((day, index) => ({
    value: day.feedingOz,
    label: day.date,
    dataPointText: day.feedingOz > 0 ? day.feedingOz.toFixed(1) : '',
    textColor: colors.text,
    textFontSize: 10,
  }));

  const sleepChartData = dailyData.map((day, index) => ({
    value: day.sleepMinutes / 60, // Convert to hours
    label: day.date,
    dataPointText: day.sleepMinutes > 0 ? (day.sleepMinutes / 60).toFixed(1) : '',
    textColor: colors.text,
    textFontSize: 10,
    frontColor: colors.sleep.primary,
  }));

  const activityChartData = dailyData.map((day, index) => ({
    value: day.feedings,
    label: day.date,
    frontColor: colors.feeding.primary,
    spacing: 8,
    labelWidth: 40,
    labelTextStyle: { color: colors.textSecondary, fontSize: 10 },
  }));

  const diaperChartData = dailyData.map((day, index) => ({
    value: day.diapers,
    label: day.date,
    frontColor: colors.diaper.primary,
    spacing: 8,
    labelWidth: 40,
    labelTextStyle: { color: colors.textSecondary, fontSize: 10 },
  }));

  // Calculate totals
  const totals = dailyData.reduce(
    (acc, day) => ({
      feedings: acc.feedings + day.feedings,
      feedingOz: acc.feedingOz + day.feedingOz,
      sleepMinutes: acc.sleepMinutes + day.sleepMinutes,
      diapers: acc.diapers + day.diapers,
    }),
    { feedings: 0, feedingOz: 0, sleepMinutes: 0, diapers: 0 }
  );

  const avgPerDay = {
    feedings: (totals.feedings / dailyData.length).toFixed(1),
    feedingOz: (totals.feedingOz / dailyData.length).toFixed(1),
    sleepHours: (totals.sleepMinutes / dailyData.length / 60).toFixed(1),
    diapers: (totals.diapers / dailyData.length).toFixed(1),
  };

  // Generate smart insights
  const generateInsights = (data: DayData[], range: TimeRange) => {
    const insights: Array<{ icon: string; text: string; color: string }> = [];
    
    if (data.length < 2) {
      insights.push({
        icon: '📊',
        text: 'Keep tracking to see insights!',
        color: colors.textSecondary,
      });
      return insights;
    }

    // Split data into current and previous period
    const midpoint = Math.floor(data.length / 2);
    const prevPeriod = data.slice(0, midpoint);
    const currPeriod = data.slice(midpoint);

    // Calculate averages for each period
    const prevAvg = {
      feedings: prevPeriod.reduce((sum, d) => sum + d.feedingOz, 0) / prevPeriod.length,
      sleep: prevPeriod.reduce((sum, d) => sum + d.sleepMinutes, 0) / prevPeriod.length / 60,
      diapers: prevPeriod.reduce((sum, d) => sum + d.diapers, 0) / prevPeriod.length,
    };

    const currAvg = {
      feedings: currPeriod.reduce((sum, d) => sum + d.feedingOz, 0) / currPeriod.length,
      sleep: currPeriod.reduce((sum, d) => sum + d.sleepMinutes, 0) / currPeriod.length / 60,
      diapers: currPeriod.reduce((sum, d) => sum + d.diapers, 0) / currPeriod.length,
    };

    // Feeding insight
    const feedingChange = ((currAvg.feedings - prevAvg.feedings) / prevAvg.feedings) * 100;
    if (Math.abs(feedingChange) > 10) {
      insights.push({
        icon: '🍼',
        text: `Feeding ${feedingChange > 0 ? 'up' : 'down'} ${Math.abs(feedingChange).toFixed(0)}% from previous period`,
        color: colors.feeding.primary,
      });
    } else {
      insights.push({
        icon: '🍼',
        text: `Feeding stable at ${currAvg.feedings.toFixed(1)} oz/day`,
        color: colors.feeding.primary,
      });
    }

    // Sleep insight
    const sleepChange = currAvg.sleep - prevAvg.sleep;
    if (Math.abs(sleepChange) > 1) {
      insights.push({
        icon: '😴',
        text: `Sleep ${sleepChange > 0 ? 'improved' : 'decreased'} by ${Math.abs(sleepChange).toFixed(1)} hours`,
        color: colors.sleep.primary,
      });
    } else {
      insights.push({
        icon: '😴',
        text: `Sleep consistent at ${currAvg.sleep.toFixed(1)} hours/day`,
        color: colors.sleep.primary,
      });
    }

    // Diaper insight
    const diaperChange = ((currAvg.diapers - prevAvg.diapers) / prevAvg.diapers) * 100;
    if (Math.abs(diaperChange) > 15) {
      insights.push({
        icon: '🧷',
        text: `Diapers ${diaperChange > 0 ? 'increased' : 'decreased'} ${Math.abs(diaperChange).toFixed(0)}%`,
        color: colors.diaper.primary,
      });
    } else {
      insights.push({
        icon: '🧷',
        text: `Diapers consistent at ${currAvg.diapers.toFixed(1)}/day`,
        color: colors.diaper.primary,
      });
    }

    // Find longest feeding gap
    const feedingGaps = data
      .filter(d => d.feedings > 0)
      .map((_, i, arr) => {
        if (i === arr.length - 1) return 0;
        const nextFeedingIndex = arr.findIndex((d, j) => j > i && d.feedings > 0);
        return nextFeedingIndex - i;
      })
      .filter(gap => gap > 0);

    const longestGap = Math.max(...feedingGaps, 0);
    if (longestGap > 1) {
      insights.push({
        icon: '⏰',
        text: `Longest gap between feedings: ${longestGap} days`,
        color: colors.error,
      });
    }

    return insights;
  };

  // Generate week-over-week comparison
  const generateWeekComparison = (data: DayData[]) => {
    if (data.length < 14) return [];

    const midpoint = Math.floor(data.length / 2);
    const week1 = data.slice(0, midpoint);
    const week2 = data.slice(midpoint);

    const week1Totals = {
      feedings: week1.reduce((sum, d) => sum + d.feedingOz, 0),
      sleep: week1.reduce((sum, d) => sum + d.sleepMinutes, 0),
      diapers: week1.reduce((sum, d) => sum + d.diapers, 0),
    };

    const week2Totals = {
      feedings: week2.reduce((sum, d) => sum + d.feedingOz, 0),
      sleep: week2.reduce((sum, d) => sum + d.sleepMinutes, 0),
      diapers: week2.reduce((sum, d) => sum + d.diapers, 0),
    };

    return [
      {
        label: 'Feeding Volume',
        change: Math.round(((week2Totals.feedings - week1Totals.feedings) / week1Totals.feedings) * 100),
      },
      {
        label: 'Total Sleep',
        change: Math.round(((week2Totals.sleep - week1Totals.sleep) / week1Totals.sleep) * 100),
      },
      {
        label: 'Diaper Changes',
        change: Math.round(((week2Totals.diapers - week1Totals.diapers) / week1Totals.diapers) * 100),
      },
    ];
  };

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
          </View>

          <View style={{ width: 44 }} />
        </View>

        <PremiumGate feature="Advanced Analytics">
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >
            {/* Time Range Selector */}
            <View style={styles.timeRangeContainer}>
              <TouchableOpacity
                style={[
                  styles.timeRangeButton,
                  timeRange === '7d' && { backgroundColor: colors.tint },
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTimeRange('7d');
                }}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: timeRange === '7d' ? '#fff' : colors.text },
                  ]}
                >
                  7 Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.timeRangeButton,
                  timeRange === '14d' && { backgroundColor: colors.tint },
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTimeRange('14d');
                }}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: timeRange === '14d' ? '#fff' : colors.text },
                  ]}
                >
                  14 Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.timeRangeButton,
                  timeRange === '30d' && { backgroundColor: colors.tint },
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTimeRange('30d');
                }}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: timeRange === '30d' ? '#fff' : colors.text },
                  ]}
                >
                  30 Days
                </Text>
              </TouchableOpacity>
            </View>

            {/* Summary Stats */}
            <View style={styles.summaryGrid}>
              <GlassCard style={styles.summaryCard}>
                <MaterialCommunityIcons
                  name="baby-bottle-outline"
                  size={24}
                  color={colors.feeding.primary}
                />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {avgPerDay.feedings}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Avg Feedings/Day
                </Text>
              </GlassCard>

              <GlassCard style={styles.summaryCard}>
                <MaterialCommunityIcons name="sleep" size={24} color={colors.sleep.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {avgPerDay.sleepHours}h
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Avg Sleep/Day
                </Text>
              </GlassCard>

              <GlassCard style={styles.summaryCard}>
                <MaterialCommunityIcons
                  name="human-baby-changing-table"
                  size={24}
                  color={colors.diaper.primary}
                />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {avgPerDay.diapers}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Avg Diapers/Day
                </Text>
              </GlassCard>
            </View>

            {/* Smart Insights */}
            <GlassCard style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <MaterialCommunityIcons name="lightbulb-on" size={24} color="#FFD700" />
                <Text style={[styles.insightsTitle, { color: colors.text }]}>
                  Smart Insights
                </Text>
              </View>
              {generateInsights(dailyData, timeRange).map((insight, index) => (
                <View key={index} style={styles.insightRow}>
                  <Text style={[styles.insightIcon, { color: insight.color }]}>
                    {insight.icon}
                  </Text>
                  <Text style={[styles.insightText, { color: colors.text }]}>
                    {insight.text}
                  </Text>
                </View>
              ))}
            </GlassCard>

            {/* Feeding Trend */}
            <GlassCard style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <MaterialCommunityIcons
                  name="baby-bottle-outline"
                  size={20}
                  color={colors.feeding.primary}
                />
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  Feeding Trend
                </Text>
              </View>
              <LineChart
                data={feedingChartData}
                width={CHART_WIDTH}
                height={180}
                color={colors.feeding.primary}
                thickness={3}
                startFillColor={colors.feeding.primary}
                endFillColor={colors.feeding.primary}
                startOpacity={0.4}
                endOpacity={0.1}
                noOfSections={4}
                yAxisColor="transparent"
                xAxisColor="transparent"
                hideDataPoints={dailyData.length > 7}
                curved
                areaChart
                hideAxesAndRules
                hideYAxisText
              />
              <Text style={[styles.chartCaption, { color: colors.textSecondary }]}>
                Daily volume over selected period
              </Text>
            </GlassCard>

            {/* Sleep Trend */}
            <GlassCard style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <MaterialCommunityIcons name="sleep" size={20} color={colors.sleep.primary} />
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  Sleep Trend
                </Text>
              </View>
              <LineChart
                data={sleepChartData.map(d => ({ ...d, dataPointText: '' }))}
                width={CHART_WIDTH}
                height={180}
                color={colors.sleep.primary}
                thickness={3}
                startFillColor={colors.sleep.primary}
                endFillColor={colors.sleep.primary}
                startOpacity={0.4}
                endOpacity={0.1}
                noOfSections={4}
                yAxisColor="transparent"
                xAxisColor="transparent"
                hideDataPoints={dailyData.length > 7}
                curved
                areaChart
                hideAxesAndRules
                hideYAxisText
              />
              <Text style={[styles.chartCaption, { color: colors.textSecondary }]}>
                Hours per day over selected period
              </Text>
            </GlassCard>

            {/* Diaper Pattern */}
            <GlassCard style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <MaterialCommunityIcons
                  name="human-baby-changing-table"
                  size={20}
                  color={colors.diaper.primary}
                />
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  Diaper Pattern
                </Text>
              </View>
              <BarChart
                data={diaperChartData.map((d, i) => ({
                  value: d.value,
                  frontColor: colors.diaper.primary,
                  spacing: i === 0 ? 20 : 6,
                }))}
                width={CHART_WIDTH}
                height={180}
                barWidth={Math.max(20, CHART_WIDTH / dailyData.length - 12)}
                roundedTop
                noOfSections={3}
                yAxisColor="transparent"
                xAxisColor="transparent"
                hideAxesAndRules
                hideYAxisText
              />
              <Text style={[styles.chartCaption, { color: colors.textSecondary }]}>
                Changes per day
              </Text>
            </GlassCard>

            {/* Weekly Comparison */}
            {timeRange !== '7d' && (
              <GlassCard style={styles.comparisonCard}>
                <Text style={[styles.comparisonTitle, { color: colors.text }]}>
                  Week-over-Week
                </Text>
                {generateWeekComparison(dailyData).map((comparison, index) => (
                  <View key={index} style={styles.comparisonRow}>
                    <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                      {comparison.label}
                    </Text>
                    <View style={styles.comparisonValue}>
                      <Text
                        style={[
                          styles.comparisonChange,
                          {
                            color:
                              comparison.change > 0
                                ? colors.success
                                : comparison.change < 0
                                ? colors.error
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {comparison.change > 0 ? '↑' : comparison.change < 0 ? '↓' : '→'}{' '}
                        {Math.abs(comparison.change)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            )}
          </ScrollView>
        </PremiumGate>
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
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  chartCard: {
    padding: 20,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  activityLegend: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  insightsCard: {
    padding: 20,
    marginBottom: 20,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  insightIcon: {
    fontSize: 20,
    width: 24,
  },
  insightText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  chartCaption: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  comparisonCard: {
    padding: 20,
    marginBottom: 20,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  comparisonLabel: {
    fontSize: 14,
  },
  comparisonValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonChange: {
    fontSize: 16,
    fontWeight: '700',
  },
});