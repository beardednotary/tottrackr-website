import { StorageService } from '@/services/StorageService';
import { Alert, Share } from 'react-native';
import type { Entry, WeightEntry, BabyProfile } from '@/types';

type ExportFormat = 'csv' | 'text';

interface DailySummary {
  date: string;
  totalFeedings: number;
  feedingsByType: { formula: number; breastmilk: number };
  totalDiapers: number;
  diapersByType: { wet: number; dirty: number; both: number };
  totalSleep: number; // minutes
  weights: number[];
}

export class DataExportService {
  /**
   * Export data for a date range
   */
  static async exportData(
    startDate: string,
    endDate: string,
    format: ExportFormat = 'csv'
  ): Promise<void> {
    try {
      console.log(`[Export] Starting ${format} export for ${startDate} to ${endDate}`);

      const baby = await StorageService.getBabyProfile();
      if (!baby) {
        Alert.alert('Error', 'No baby profile found');
        return;
      }

      const entries = await this.getEntriesInRange(startDate, endDate);
      const weights = await this.getWeightsInRange(startDate, endDate);
      const dailySummaries = this.generateDailySummaries(entries, weights, startDate, endDate);

      let content: string;
      let title: string;

      switch (format) {
        case 'csv':
          content = this.generateCSVContent(baby, dailySummaries, entries);
          title = `TotTrackr Report - ${baby.name}.csv`;
          break;
        case 'text':
        default:
          content = this.generateTextContent(baby, dailySummaries, entries);
          title = `TotTrackr Report - ${baby.name}.txt`;
          break;
      }

      // Share using native Share API
      await Share.share({
        message: content,
        title: title,
      });

      console.log('[Export] Export successful');
    } catch (error) {
      console.error('[Export] Error:', error);
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    }
  }

  /**
   * Get entries within date range
   */
  private static async getEntriesInRange(
    startDate: string,
    endDate: string
  ): Promise<Entry[]> {
    const allEntries = await StorageService.getEntries();
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);

    return allEntries.filter(
      (entry) => entry.timestamp >= start && entry.timestamp <= end
    );
  }

  /**
   * Get weights within date range
   */
  private static async getWeightsInRange(
    startDate: string,
    endDate: string
  ): Promise<WeightEntry[]> {
    const allWeights = await StorageService.getWeightEntries();
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);

    return allWeights.filter(
      (entry) => entry.timestamp >= start && entry.timestamp <= end
    );
  }

  /**
   * Generate daily summaries with totals
   */
  private static generateDailySummaries(
    entries: Entry[],
    weights: WeightEntry[],
    startDate: string,
    endDate: string
  ): DailySummary[] {
    const summaries: DailySummary[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);

      const dayEntries = entries.filter(
        (e) => e.timestamp >= dayStart && e.timestamp <= dayEnd
      );

      const dayWeights = weights.filter(
        (w) => w.timestamp >= dayStart && w.timestamp <= dayEnd
      );

      // Count feedings by type
      const feedings = dayEntries.filter((e) => e.type === 'feeding');
      const feedingsByType = {
        formula: feedings.filter((f) => f.feedingType === 'formula').length,
        breastmilk: feedings.filter((f) => f.feedingType === 'breastmilk').length,
      };

      // Count diapers by type
      const diapers = dayEntries.filter((e) => e.type === 'diaper');
      const diapersByType = {
        wet: diapers.filter((d) => d.diaperType === 'wet').length,
        dirty: diapers.filter((d) => d.diaperType === 'dirty').length,
        both: diapers.filter((d) => d.diaperType === 'both').length,
      };

      // Calculate total sleep
      const sleeps = dayEntries.filter((e) => e.type === 'sleep');
      const totalSleep = sleeps.reduce((sum, s) => sum + (s.duration || 0), 0);

      // Only add day if there's activity
      if (dayEntries.length > 0 || dayWeights.length > 0) {
        summaries.push({
          date: dateStr,
          totalFeedings: feedings.length,
          feedingsByType,
          totalDiapers: diapers.length,
          diapersByType,
          totalSleep,
          weights: dayWeights.map((w) => w.weight),
        });
      }
    }

    return summaries;
  }

  /**
   * Generate CSV format content
   */
  private static generateCSVContent(
    baby: BabyProfile,
    summaries: DailySummary[],
    entries: Entry[]
  ): string {
    const lines: string[] = [];

    // Header
    lines.push(`TotTrackr Report - ${baby.name}`);
    lines.push(`Date of Birth: ${new Date(baby.dateOfBirth).toLocaleDateString()}`);
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push('');

    // Overall totals
    const totalFeedings = summaries.reduce((sum, d) => sum + d.totalFeedings, 0);
    const totalDiapers = summaries.reduce((sum, d) => sum + d.totalDiapers, 0);
    const totalSleep = summaries.reduce((sum, d) => sum + d.totalSleep, 0);
    
    lines.push('OVERALL SUMMARY');
    lines.push(`Total Days,${summaries.length}`);
    lines.push(`Total Feedings,${totalFeedings}`);
    lines.push(`Total Diapers,${totalDiapers}`);
    lines.push(`Total Sleep (hours),${(totalSleep / 60).toFixed(1)}`);
    lines.push('');

    // Daily Summary Section
    lines.push('DAILY SUMMARY');
    lines.push(
      'Date,Total Feedings,Formula,Breast Milk,Total Diapers,Wet,Dirty,Both,Total Sleep (min),Weight (lbs)'
    );

    summaries.forEach((day) => {
      const sleepFormatted = day.totalSleep > 0 ? day.totalSleep.toString() : '0';
      const weightFormatted = day.weights.length > 0 ? day.weights[0].toFixed(1) : '-';

      lines.push(
        [
          day.date,
          day.totalFeedings,
          day.feedingsByType.formula,
          day.feedingsByType.breastmilk,
          day.totalDiapers,
          day.diapersByType.wet,
          day.diapersByType.dirty,
          day.diapersByType.both,
          sleepFormatted,
          weightFormatted,
        ].join(',')
      );
    });

    lines.push('');

    // Detailed Log Section
    lines.push('DETAILED LOG');
    lines.push('Date,Time,Type,Details');

    entries
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((entry) => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const time = new Date(entry.timestamp).toLocaleTimeString();
        let details = '';

        switch (entry.type) {
          case 'feeding':
            details = `${entry.feedingType || 'unknown'}, ${entry.amount || 0}oz`;
            break;
          case 'diaper':
            details = entry.diaperType || 'unknown';
            break;
          case 'sleep':
            const hrs = Math.floor((entry.duration || 0) / 60);
            const mins = (entry.duration || 0) % 60;
            details = `${hrs}h ${mins}m`;
            break;
        }

        lines.push([date, time, entry.type, details].join(','));
      });

    return lines.join('\n');
  }

  /**
   * Generate text format (for sharing/printing)
   */
  private static generateTextContent(
    baby: BabyProfile,
    summaries: DailySummary[],
    entries: Entry[]
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('═'.repeat(50));
    lines.push(`TotTrackr Report - ${baby.name}`);
    lines.push('═'.repeat(50));
    lines.push(`Date of Birth: ${new Date(baby.dateOfBirth).toLocaleDateString()}`);
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push('');

    // Summary totals
    const totalFeedings = summaries.reduce((sum, d) => sum + d.totalFeedings, 0);
    const totalDiapers = summaries.reduce((sum, d) => sum + d.totalDiapers, 0);
    const totalSleep = summaries.reduce((sum, d) => sum + d.totalSleep, 0);

    lines.push('OVERALL TOTALS');
    lines.push('─'.repeat(50));
    lines.push(`Days Tracked: ${summaries.length}`);
    lines.push(`Total Feedings: ${totalFeedings}`);
    lines.push(`Total Diapers: ${totalDiapers}`);
    lines.push(`Total Sleep: ${Math.floor(totalSleep / 60)}h ${totalSleep % 60}m`);
    lines.push('');

    // Daily breakdown
    lines.push('DAILY BREAKDOWN');
    lines.push('═'.repeat(50));

    summaries.forEach((day) => {
      lines.push('');
      lines.push(`${new Date(day.date).toLocaleDateString()}`);
      lines.push('─'.repeat(50));
      lines.push(
        `Feedings: ${day.totalFeedings} (Formula: ${day.feedingsByType.formula}, Breast: ${day.feedingsByType.breastmilk})`
      );
      lines.push(
        `Diapers: ${day.totalDiapers} (Wet: ${day.diapersByType.wet}, Dirty: ${day.diapersByType.dirty}, Both: ${day.diapersByType.both})`
      );

      if (day.totalSleep > 0) {
        lines.push(
          `Sleep: ${Math.floor(day.totalSleep / 60)}h ${day.totalSleep % 60}m`
        );
      }

      if (day.weights.length > 0) {
        lines.push(`Weight: ${day.weights[0].toFixed(1)} lbs`);
      }
    });

    return lines.join('\n');
  }
}