// services/StorageService.ts - UPDATED FOR MULTI-BABY SUPPORT
// Replace your existing StorageService.ts with this file

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Entry,
  DailySummary,
  SleepEntry,
  BabyProfile,
  WeightEntry,
  ExportData,
  ActiveBreastSession,
} from '../types';

const STORAGE_KEYS = {
  ENTRIES: 'tottrackr_entries',
  PREFERENCES: 'tottrackr.preferences.v1',
  ACTIVE_SLEEP: 'tottrackr_active_sleep',
  BABY_PROFILE: 'tottrackr_baby_profile',
  WEIGHTS: 'tottrackr_weights',
  SYNC_ENABLED: 'tottrackr_sync_enabled',
  BABY_ID: 'tottrackr_baby_id',
  ACTIVE_BREAST: 'tottrackr_active_breast',
  BABY_PROFILES: 'tottrackr_baby_profiles',  
  ACTIVE_BABY_ID: 'tottrackr_active_baby_id',  
};

// ===== Preferences types =====
export type UnitSystem = 'imperial' | 'metric';
export type HandPreference = 'left' | 'right';

export type Preferences = {
  handPreference: HandPreference;
  showActionLabels: boolean;
  units: {
    volume: UnitSystem;
    weight: UnitSystem;
  };
  darkMode: boolean;
  hapticFeedback: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  handPreference: 'right',
  showActionLabels: true,
  units: { volume: 'imperial', weight: 'imperial' },
  darkMode: false,
  hapticFeedback: true,
};

// ===== Data change listeners =====
type DataListener = () => void;
const dataListeners = new Set<DataListener>();

export const onDataChanged = (fn: DataListener) => {
  dataListeners.add(fn);
  return () => dataListeners.delete(fn);
};

const emitDataChanged = () => {
  dataListeners.forEach((fn) => fn());
};

// ===== Sync info =====
export type SyncInfo = {
  enabled: boolean;
  lastSync: number | null;
  babyId: string | null;
};

export class StorageService {
  // ========== ENTRIES ==========

  static async getEntries(): Promise<Entry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (!raw) return [];
      
      const allEntries = JSON.parse(raw);
      const activeId = await this.getActiveBabyId();
      
      // If no active baby, return all entries (backwards compatibility)
      if (!activeId) return allEntries;
      
      // Filter to only active baby's entries
      return allEntries.filter((e: Entry) => !e.babyId || e.babyId === activeId);
    } catch (err) {
      console.error('[StorageService] getEntries failed:', err);
      return [];
    }
  }

  static async saveEntry(entry: Entry): Promise<boolean> {
    try {
      // Add active baby ID to entry if not present
      if (!entry.babyId) {
        const activeId = await this.getActiveBabyId();
        if (activeId) {
          entry.babyId = activeId;
        }
      }
      
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
      const entries = raw ? JSON.parse(raw) : [];
      entries.push(entry);
      await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
      emitDataChanged();
      return true;
    } catch (err) {
      console.error('[StorageService] saveEntry failed:', err);
      return false;
    }
  }

  static async updateEntry(id: string, updates: Partial<Entry>): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (!raw) return false;
      
      const entries = JSON.parse(raw);
      const idx = entries.findIndex((e: Entry) => e.id === id);
      if (idx === -1) return false;

      entries[idx] = { ...entries[idx], ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
      emitDataChanged();
      return true;
    } catch (err) {
      console.error('[StorageService] updateEntry failed:', err);
      return false;
    }
  }

  static async getEntriesByDate(date: Date): Promise<Entry[]> {
    const entries = await this.getEntries();
    const target = date.toISOString().split('T')[0];
    return entries.filter((e) => new Date(e.timestamp).toISOString().split('T')[0] === target);
  }

  // ========== DAILY SUMMARIES ==========

  static async getDailySummaries(startDate?: Date, endDate?: Date): Promise<DailySummary[]> {
    try {
      const entries = await this.getEntries();
      const summaryMap = new Map<string, DailySummary>();

      for (const entry of entries) {
        const day = new Date(entry.timestamp).toISOString().split('T')[0];

        if (!summaryMap.has(day)) {
          summaryMap.set(day, {
            date: day,
            totalFeedings: 0,
            totalDiapers: 0,
            totalSleep: 0,
          });
        }

        const summary = summaryMap.get(day)!;

        if (entry.type === 'feeding') {
          summary.totalFeedings += 1;
          summary.lastFeeding = entry.timestamp;
        } else if (entry.type === 'diaper') {
          summary.totalDiapers += 1;
          summary.lastDiaper = entry.timestamp;
        } else if (entry.type === 'sleep') {
          if (entry.duration) {
            summary.totalSleep += entry.duration;
          }
        }
      }

      let summaries = Array.from(summaryMap.values());

      if (startDate || endDate) {
        const start = startDate ? startDate.toISOString().split('T')[0] : null;
        const end = endDate ? endDate.toISOString().split('T')[0] : null;

        summaries = summaries.filter((s) => {
          if (start && s.date < start) return false;
          if (end && s.date > end) return false;
          return true;
        });
      }

      return summaries.sort((a, b) => (a.date < b.date ? 1 : -1));
    } catch (err) {
      console.error('[StorageService] getDailySummaries failed:', err);
      return [];
    }
  }

  static async getDailySummary(date: Date): Promise<DailySummary | null> {
    const res = await this.getDailySummaries(date, date);
    return res[0] || null;
  }

  // ========== ACTIVE SLEEP ==========

  static async saveActiveSleep(sleep: SleepEntry): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SLEEP, JSON.stringify(sleep));
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] saveActiveSleep failed:', err);
      throw err;
    }
  }

static async getActiveSleep(): Promise<SleepEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SLEEP);
    if (!raw) return null;
    
    const sleep = JSON.parse(raw);
    const activeId = await this.getActiveBabyId();
    
    // Only return if it belongs to active baby
    if (sleep.babyId && sleep.babyId !== activeId) {
      return null;
    }
    
    return sleep;
  } catch (err) {
    console.error('[StorageService] getActiveSleep failed:', err);
    return null;
  }
}

  static async clearActiveSleep(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SLEEP);
    } catch (err) {
      console.error('[StorageService] clearActiveSleep failed:', err);
      throw err;
    }
  }

  static async startSleepTimer(): Promise<SleepEntry> {
    const now = Date.now();
    const activeId = await this.getActiveBabyId();
    const sleepEntry: SleepEntry = {
      id: now.toString(),
      type: 'sleep',
      timestamp: now,
      startTime: now,
      duration: 0,
      isActive: true,
      babyId: activeId,
    };
    await this.saveActiveSleep(sleepEntry);
    return sleepEntry;
  }

  static async stopSleepTimer(): Promise<Entry | null> {
    try {
      const activeSleep = await this.getActiveSleep();
      if (!activeSleep) return null;

      const endTime = Date.now();
      const duration = Math.floor((endTime - activeSleep.startTime) / 1000 / 60);

      const completed: Entry = {
        ...activeSleep,
        endTime,
        duration,
        isActive: false,
      };

      await this.saveEntry(completed);
      await this.clearActiveSleep();
      return completed;
    } catch (err) {
      console.error('[StorageService] stopSleepTimer failed:', err);
      return null;
    }
  }

  // ========== ACTIVE BREAST FEEDING ==========

  static async startBreastTimer(side: 'left' | 'right'): Promise<ActiveBreastSession> {
    const now = Date.now();
    const activeId = await this.getActiveBabyId();
    const session: ActiveBreastSession = {
      id: now.toString(),
      startTime: now,
      side,
      isActive: true,
      babyId: activeId,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_BREAST, JSON.stringify(session));
    emitDataChanged();
    return session;
  }

static async getActiveBreast(): Promise<ActiveBreastSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_BREAST);
    if (!raw) return null;
    
    const breast = JSON.parse(raw);
    const activeId = await this.getActiveBabyId();
    
    // Only return if it belongs to active baby
    if (breast.babyId && breast.babyId !== activeId) {
      return null;
    }
    
    return breast;
  } catch (err) {
    console.error('[StorageService] getActiveBreast failed:', err);
    return null;
  }
}

  static async stopBreastTimer(): Promise<Entry | null> {
    try {
      const activeBreast = await this.getActiveBreast();
      if (!activeBreast) return null;

      const endTime = Date.now();
      const durationMinutes = Math.floor((endTime - activeBreast.startTime) / 1000 / 60);

      const entry: Entry = {
        id: `feeding_${endTime}`,
        type: 'feeding',
        timestamp: activeBreast.startTime,
        feedingType: 'breast',
        amount: 0,
        breastSide: activeBreast.side,
        duration: durationMinutes,
        endTime,
        isActive: false,
      };

      await this.saveEntry(entry);
      await this.clearActiveBreast();
      return entry;
    } catch (err) {
      console.error('[StorageService] stopBreastTimer failed:', err);
      return null;
    }
  }

  static async clearActiveBreast(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_BREAST);
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] clearActiveBreast failed:', err);
    }
  }

  // ========== BABY PROFILE ==========

  static async saveBabyProfile(profile: BabyProfile): Promise<void> {
    try {
      const profiles = await this.getAllBabyProfiles();
      const index = profiles.findIndex(p => p.id === profile.id);
      
      if (index >= 0) {
        profiles[index] = profile;
      } else {
        profiles.push(profile);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.BABY_PROFILES, JSON.stringify(profiles));
      
      // Also update BABY_PROFILE for backwards compatibility
      const activeId = await this.getActiveBabyId();
      if (profile.id === activeId) {
        await AsyncStorage.setItem(STORAGE_KEYS.BABY_PROFILE, JSON.stringify(profile));
      }
      
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] saveBabyProfile failed:', err);
      throw err;
    }
  }

  static async getBabyProfile(): Promise<BabyProfile | null> {
    try {
      const activeId = await this.getActiveBabyId();
      if (!activeId) {
        // Fallback to old single profile
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.BABY_PROFILE);
        return raw ? JSON.parse(raw) : null;
      }
      
      const profiles = await this.getAllBabyProfiles();
      return profiles.find(p => p.id === activeId) || null;
    } catch (err) {
      console.error('[StorageService] getBabyProfile failed:', err);
      return null;
    }
  }

  // ========== MULTI-BABY SUPPORT ==========

  static async getAllBabyProfiles(): Promise<BabyProfile[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.BABY_PROFILES);
      if (!raw) {
        // If no profiles exist, migrate current profile
        const oldProfile = await AsyncStorage.getItem(STORAGE_KEYS.BABY_PROFILE);
        if (oldProfile) {
          const profile = JSON.parse(oldProfile);
          const profiles = [profile];
          await AsyncStorage.setItem(STORAGE_KEYS.BABY_PROFILES, JSON.stringify(profiles));
          await this.setActiveBabyId(profile.id);
          return profiles;
        }
        return [];
      }
      return JSON.parse(raw);
    } catch (error) {
      console.error('[StorageService] getAllBabyProfiles failed:', error);
      return [];
    }
  }

  static async deleteBabyProfile(profileId: string): Promise<void> {
    try {
      // Remove from profiles array
      const profiles = await this.getAllBabyProfiles();
      const filtered = profiles.filter(p => p.id !== profileId);
      await AsyncStorage.setItem(STORAGE_KEYS.BABY_PROFILES, JSON.stringify(filtered));
      
      // Delete all entries for this baby
      const allEntries = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (allEntries) {
        const entries = JSON.parse(allEntries);
        const filteredEntries = entries.filter((e: Entry) => e.babyId !== profileId);
        await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(filteredEntries));
      }
      
      // Delete all weights for this baby
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (raw) {
        const weights = JSON.parse(raw);
        const filteredWeights = weights.filter((w: WeightEntry) => w.babyId !== profileId);
        await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(filteredWeights));
      }
      
      emitDataChanged();
    } catch (error) {
      console.error('[StorageService] deleteBabyProfile failed:', error);
    }
  }

  static async getActiveBabyId(): Promise<string> {
    try {
      const id = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_BABY_ID);
      if (id) return id;
      
      // If no active ID, use first profile
      const profiles = await this.getAllBabyProfiles();
      if (profiles.length > 0) {
        await this.setActiveBabyId(profiles[0].id);
        return profiles[0].id;
      }
      
      return '';
    } catch (error) {
      console.error('[StorageService] getActiveBabyId failed:', error);
      return '';
    }
  }

  static async setActiveBabyId(babyId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_BABY_ID, babyId);
      
      // Update BABY_PROFILE for backwards compatibility
      const profiles = await this.getAllBabyProfiles();
      const profile = profiles.find(p => p.id === babyId);
      if (profile) {
        await AsyncStorage.setItem(STORAGE_KEYS.BABY_PROFILE, JSON.stringify(profile));
      }
      
      emitDataChanged();
    } catch (error) {
      console.error('[StorageService] setActiveBabyId failed:', error);
    }
  }

  /**
 * Migrate old entries to first profile (one-time migration)
 */
static async migrateOldEntriesToFirstProfile(): Promise<void> {
  try {
    const profiles = await this.getAllBabyProfiles();
    if (profiles.length === 0) return;
    
    const firstBabyId = profiles[0].id;
    
    // Migrate entries
    const entriesRaw = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (entriesRaw) {
      const entries = JSON.parse(entriesRaw);
      let migrated = false;
      
      const updatedEntries = entries.map((e: Entry) => {
        if (!e.babyId) {
          migrated = true;
          return { ...e, babyId: firstBabyId };
        }
        return e;
      });
      
      if (migrated) {
        await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
        console.log('[StorageService] Migrated entries to first profile');
      }
    }
    
    // Migrate weights
    const weightsRaw = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
    if (weightsRaw) {
      const weights = JSON.parse(weightsRaw);
      let migrated = false;
      
      const updatedWeights = weights.map((w: WeightEntry) => {
        if (!w.babyId) {
          migrated = true;
          return { ...w, babyId: firstBabyId };
        }
        return w;
      });
      
      if (migrated) {
        await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(updatedWeights));
        console.log('[StorageService] Migrated weights to first profile');
      }
    }
    
    emitDataChanged();
  } catch (error) {
    console.error('[StorageService] Migration failed:', error);
  }
}

  // ========== WEIGHTS ==========

  static async saveWeightEntry(entry: WeightEntry): Promise<void> {
    try {
      // Add active baby ID if not present
      if (!entry.babyId) {
        const activeId = await this.getActiveBabyId();
        if (activeId) {
          entry.babyId = activeId;
        }
      }
      
      const weights = await this.getWeightEntries();
      weights.push(entry);
      await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(weights));
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] saveWeightEntry failed:', err);
      throw err;
    }
  }

  static async getWeightEntries(): Promise<WeightEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS);
      if (!raw) return [];
      
      const allWeights = JSON.parse(raw);
      const activeId = await this.getActiveBabyId();
      
      // If no active baby, return all weights (backwards compatibility)
      if (!activeId) return allWeights;
      
      // Filter to only active baby's weights
      return allWeights.filter((w: WeightEntry) => !w.babyId || w.babyId === activeId);
    } catch (err) {
      console.error('[StorageService] getWeightEntries failed:', err);
      return [];
    }
  }

  static async getWeightsByDate(start: Date, end: Date): Promise<WeightEntry[]> {
    const all = await this.getWeightEntries();
    const startMs = start.getTime();
    const endMs = end.getTime();
    return all.filter((w) => w.timestamp >= startMs && w.timestamp < endMs);
  }

  // ========== SYNC FLAGS (multi-user) ==========

  static async getSyncInfo(): Promise<SyncInfo> {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_ENABLED);
      const babyId = await AsyncStorage.getItem(STORAGE_KEYS.BABY_ID);
      return {
        enabled: enabled === 'true',
        lastSync: null,
        babyId: babyId || null,
      };
    } catch (err) {
      console.error('[StorageService] getSyncInfo failed:', err);
      return {
        enabled: false,
        lastSync: null,
        babyId: null,
      };
    }
  }

  static async enableSync(babyId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.BABY_ID, babyId);
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] enableSync failed:', err);
      throw err;
    }
  }

  static async disableSync(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_ENABLED);
      await AsyncStorage.removeItem(STORAGE_KEYS.BABY_ID);
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] disableSync failed:', err);
      throw err;
    }
  }

  // ========== EXPORT / IMPORT ==========

  static async exportData(): Promise<ExportData> {
    const entries = await this.getEntries();
    const weights = await this.getWeightEntries();
    const baby = await this.getBabyProfile();

    const now = Date.now();
    const safeBaby: BabyProfile = baby ?? {
      id: 'local-baby',
      name: 'Baby',
      dateOfBirth: now,
      createdAt: now,
      updatedAt: now,
    };

    const timestamps = entries.map((e) => e.timestamp).sort((a, b) => a - b);
    const nowIso = new Date().toISOString();

    const startDate =
      timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : nowIso;
    const endDate =
      timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : nowIso;

    return {
      entries,
      weights,
      baby: safeBaby,
      startDate,
      endDate,
      generatedAt: Date.now(),
      version: '1.0',
    };
  }

  static async importData(data: ExportData): Promise<void> {
    try {
      if (data.entries) {
        await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(data.entries));
      }
      if (data.weights) {
        await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(data.weights));
      }
      if (data.baby) {
        await AsyncStorage.setItem(STORAGE_KEYS.BABY_PROFILE, JSON.stringify(data.baby));
      }
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] importData failed:', err);
      throw err;
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ENTRIES);
      await AsyncStorage.removeItem(STORAGE_KEYS.WEIGHTS);
      await AsyncStorage.removeItem(STORAGE_KEYS.BABY_PROFILE);
      await AsyncStorage.removeItem(STORAGE_KEYS.BABY_PROFILES);
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_BABY_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SLEEP);
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_BREAST);
      await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_ENABLED);
      await AsyncStorage.removeItem(STORAGE_KEYS.BABY_ID);
      emitDataChanged();
    } catch (err) {
      console.error('[StorageService] clearAllData failed:', err);
      throw err;
    }
  }
}

// ===== PREFERENCES HELPERS =====

export const loadPreferences = async (): Promise<Preferences> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw) as Preferences;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      units: {
        ...DEFAULT_PREFERENCES.units,
        ...(parsed.units || {}),
      },
    };
  } catch (err) {
    console.error('[Preferences] load failed:', err);
    return DEFAULT_PREFERENCES;
  }
};

export const savePreferences = async (prefs: Preferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    emitDataChanged();
  } catch (err) {
    console.error('[Preferences] save failed:', err);
    throw err;
  }
};

export const updatePreferences = async (updates: Partial<Preferences>): Promise<void> => {
  const current = await loadPreferences();
  const next: Preferences = {
    ...current,
    ...updates,
    units: {
      ...current.units,
      ...(updates.units || {}),
    },
  };
  await savePreferences(next);
};

export const subscribePreferences = (fn: () => void) => {
  return onDataChanged(fn);
};

export const getVolumeUnitLabel = (p: Preferences) =>
  p.units.volume === 'imperial' ? 'oz' : 'mL';

export const getWeightUnitLabel = (p: Preferences) =>
  p.units.weight === 'imperial' ? 'lbs' : 'kg';

export const convertVolume = (value: number, from: UnitSystem, to: UnitSystem) => {
  if (from === to) return value;
  return from === 'imperial' ? value * 29.5735 : value / 29.5735;
};

export const convertWeight = (value: number, from: UnitSystem, to: UnitSystem) => {
  if (from === to) return value;
  return from === 'imperial' ? value * 0.45359237 : value / 0.45359237;
};