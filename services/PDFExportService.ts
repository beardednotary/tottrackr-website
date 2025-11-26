// services/PDFExportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { StorageService } from './StorageService';
import type { Entry, BabyProfile, WeightEntry } from '@/types';

interface ExportOptions {
  startDate: Date;
  endDate: Date;
  babyProfile: BabyProfile | null;
}

export class PDFExportService {
  /**
   * Generate and share a PDF report
   */
  static async generateAndShare(options: ExportOptions): Promise<boolean> {
    try {
      const html = await this.generateHTML(options);
      
      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Share it
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share TotTrackr Report',
          UTI: 'com.adobe.pdf',
        });
        return true;
      } else {
        console.log('[PDF] Sharing not available, saved to:', uri);
        return false;
      }
    } catch (error) {
      console.error('[PDF] Export failed:', error);
      return false;
    }
  }

  /**
   * Generate HTML for PDF
   */
  private static async generateHTML(options: ExportOptions): Promise<string> {
    const { startDate, endDate, babyProfile } = options;

    // Get data
    const entries = await this.getEntriesInRange(startDate, endDate);
    const weights = await this.getWeightsInRange(startDate, endDate);

    // Calculate summaries
    const summary = this.calculateSummary(entries, weights);
    const dailyBreakdown = this.generateDailyBreakdown(entries);

    // Format dates
    const startStr = this.formatDate(startDate);
    const endStr = this.formatDate(endDate);
    const babyName = babyProfile?.name || 'Baby';
    const babyAge = babyProfile ? this.calculateAge(babyProfile.dateOfBirth) : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 50px;
      color: #1a1a1a;
      line-height: 1.5;
      background: #ffffff;
    }
    
    .header {
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 4px solid #2c3e50;
    }
    
    .app-name {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 20px;
      letter-spacing: -0.5px;
    }
    
    .baby-info {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .baby-name {
      font-size: 36px;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .date-range {
      font-size: 16px;
      color: #666;
      font-weight: 500;
    }
    
    .baby-age {
      font-size: 15px;
      color: #888;
      margin-top: 8px;
    }
    
    .section {
      margin-bottom: 45px;
      page-break-inside: avoid;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid transparent;
    }
    
    .section-header.feeding {
      border-bottom-color: #10B981;
    }
    
    .section-header.sleep {
      border-bottom-color: #3B82F6;
    }
    
    .section-header.diaper {
      border-bottom-color: #F59E0B;
    }
    
    .section-header.weight {
      border-bottom-color: #8B5CF6;
    }
    
    .section-header.daily {
      border-bottom-color: #6B7FD7;
    }
    
    .section-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
    }
    
    .section-icon.feeding { background: #10B981; }
    .section-icon.sleep { background: #3B82F6; }
    .section-icon.diaper { background: #F59E0B; }
    .section-icon.weight { background: #8B5CF6; }
    .section-icon.daily { background: #6B7FD7; }
    
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e9ecef;
    }
    
    .stat-label {
      font-size: 11px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1;
    }
    
    .stat-unit {
      font-size: 16px;
      color: #6c757d;
      font-weight: 500;
      margin-left: 4px;
    }
    
    .summary-details {
      background: #f8f9fa;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 14px;
      color: #495057;
      line-height: 1.6;
    }
    
    .summary-details strong {
      color: #212529;
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
    }
    
    th {
      background: #212529;
      color: #ffffff;
      padding: 14px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    td {
      padding: 14px 16px;
      border-bottom: 1px solid #dee2e6;
      font-size: 14px;
      color: #495057;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 25px;
      border-top: 3px solid #dee2e6;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
      font-weight: 500;
    }
    
    @media print {
      body { padding: 30px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="app-name">TOTTRACKR REPORT</div>
    <div class="baby-info">
      <div>
        <div class="baby-name">${babyName}</div>
        ${babyAge ? `<div class="baby-age">${babyAge}</div>` : ''}
      </div>
      <div class="date-range">${startStr} - ${endStr}</div>
    </div>
  </div>

  <!-- Feeding Summary -->
  <div class="section">
    <div class="section-header feeding">
      <div class="section-icon feeding">F</div>
      <div class="section-title">Feeding Summary</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Feedings</div>
        <div class="stat-value">${summary.feeding.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Volume</div>
        <div class="stat-value">${summary.feeding.totalOz.toFixed(1)}<span class="stat-unit">oz</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg per Feeding</div>
        <div class="stat-value">${summary.feeding.avgPerFeeding.toFixed(1)}<span class="stat-unit">oz</span></div>
      </div>
    </div>
    <div class="summary-details">
      <strong>Bottle:</strong> ${summary.feeding.bottle} feedings (${summary.feeding.bottleOz.toFixed(1)} oz) • 
      <strong>Breast:</strong> ${summary.feeding.breast} feedings (${summary.feeding.breastMinutes} min total)
    </div>
  </div>

  <!-- Sleep Summary -->
  <div class="section">
    <div class="section-header sleep">
      <div class="section-icon sleep">S</div>
      <div class="section-title">Sleep Summary</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Sleep</div>
        <div class="stat-value">${this.formatMinutes(summary.sleep.totalMinutes)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg per Day</div>
        <div class="stat-value">${this.formatMinutes(summary.sleep.avgPerDay)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sleep Sessions</div>
        <div class="stat-value">${summary.sleep.total}</div>
      </div>
    </div>
  </div>

  <!-- Diaper Summary -->
  <div class="section">
    <div class="section-header diaper">
      <div class="section-icon diaper">D</div>
      <div class="section-title">Diaper Summary</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Changes</div>
        <div class="stat-value">${summary.diaper.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Wet</div>
        <div class="stat-value">${summary.diaper.wet}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Dirty</div>
        <div class="stat-value">${summary.diaper.dirty}</div>
      </div>
    </div>
    <div class="summary-details">
      <strong>Both (Wet & Dirty):</strong> ${summary.diaper.both} changes
    </div>
  </div>

  <!-- Weight Tracking -->
  ${weights.length > 0 ? `
  <div class="section">
    <div class="section-header weight">
      <div class="section-icon weight">W</div>
      <div class="section-title">Weight Tracking</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Weight</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        ${weights.map((w, i) => {
          const prevWeight = i > 0 ? weights[i - 1].weight : null;
          const change = prevWeight ? (w.weight - prevWeight).toFixed(2) : '-';
          const changeSign = prevWeight && w.weight > prevWeight ? '+' : '';
          return `
            <tr>
              <td>${this.formatDate(new Date(w.timestamp))}</td>
              <td>${w.weight.toFixed(2)} lbs</td>
              <td>${prevWeight ? `${changeSign}${change} lbs` : '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Daily Breakdown -->
  <div class="section">
    <div class="section-header daily">
      <div class="section-icon daily">📊</div>
      <div class="section-title">Daily Breakdown</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Feedings</th>
          <th>Sleep</th>
          <th>Diapers</th>
        </tr>
      </thead>
      <tbody>
        ${dailyBreakdown.map(day => `
          <tr>
            <td>${day.date}</td>
            <td>${day.feedings} (${day.feedingOz.toFixed(1)} oz)</td>
            <td>${this.formatMinutes(day.sleepMinutes)}</td>
            <td>${day.diapers}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated by TotTrackr on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </div>
</body>
</html>
    `;
  }

  /**
   * Get entries within date range
   */
  private static async getEntriesInRange(startDate: Date, endDate: Date): Promise<Entry[]> {
    const allEntries = await StorageService.getEntries();
    return allEntries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  /**
   * Get weights within date range
   */
  private static async getWeightsInRange(startDate: Date, endDate: Date): Promise<WeightEntry[]> {
    const allWeights = await StorageService.getWeightEntries();
    return allWeights
      .filter(w => {
        const weightDate = new Date(w.timestamp);
        return weightDate >= startDate && weightDate <= endDate;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate summary statistics
   */
  private static calculateSummary(entries: Entry[], weights: WeightEntry[]) {
    const feeding = entries.filter(e => e.type === 'feeding');
    const sleep = entries.filter(e => e.type === 'sleep');
    const diaper = entries.filter(e => e.type === 'diaper');

    const bottleFeedings = feeding.filter(f => f.feedingType === 'formula' || f.feedingType === 'pumped');
    const breastFeedings = feeding.filter(f => f.feedingType === 'breast');

    const totalOz = bottleFeedings.reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalSleepMinutes = sleep.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalBreastMinutes = breastFeedings.reduce((sum, f) => sum + (f.duration || 0), 0);

    return {
      feeding: {
        total: feeding.length,
        bottle: bottleFeedings.length,
        breast: breastFeedings.length,
        totalOz,
        bottleOz: totalOz,
        breastMinutes: totalBreastMinutes,
        avgPerFeeding: bottleFeedings.length > 0 ? totalOz / bottleFeedings.length : 0,
      },
      sleep: {
        total: sleep.length,
        totalMinutes: totalSleepMinutes,
        avgPerDay: totalSleepMinutes / this.getDayCount(entries),
      },
      diaper: {
        total: diaper.length,
        wet: diaper.filter(d => d.diaperType === 'wet').length,
        dirty: diaper.filter(d => d.diaperType === 'dirty').length,
        both: diaper.filter(d => d.diaperType === 'both').length,
      },
    };
  }

  /**
   * Generate daily breakdown
   */
  private static generateDailyBreakdown(entries: Entry[]) {
    const dayMap = new Map<string, any>();

    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      
      if (!dayMap.has(date)) {
        dayMap.set(date, {
          date,
          feedings: 0,
          feedingOz: 0,
          sleepMinutes: 0,
          diapers: 0,
        });
      }

      const day = dayMap.get(date);

      if (entry.type === 'feeding') {
        day.feedings++;
        day.feedingOz += entry.amount || 0;
      } else if (entry.type === 'sleep') {
        day.sleepMinutes += entry.duration || 0;
      } else if (entry.type === 'diaper') {
        day.diapers++;
      }
    });

    return Array.from(dayMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Helper functions
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  private static formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  private static calculateAge(dateOfBirth: number): string {
    const ageMs = Date.now() - dateOfBirth;
    const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (days < 30) return `${days} days old`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months old`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} old`;
  }

  private static getDayCount(entries: Entry[]): number {
    if (entries.length === 0) return 1;
    
    const timestamps = entries.map(e => e.timestamp);
    const minDate = Math.min(...timestamps);
    const maxDate = Math.max(...timestamps);
    const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    return Math.max(days, 1);
  }
}