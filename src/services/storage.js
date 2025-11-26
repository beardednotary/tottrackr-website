import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ENTRIES: 'tottrackr_entries'
};

export class StorageService {
  static async saveEntry(entry) {
    try {
      const existingEntries = await this.getEntries();
      const updatedEntries = [entry, ...existingEntries];
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.ENTRIES,
        JSON.stringify(updatedEntries)
      );
      
      return true;
    } catch (error) {
      console.error('Error saving entry:', error);
      return false;
    }
  }

  static async getEntries() {
    try {
      const entries = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
      return entries ? JSON.parse(entries) : [];
    } catch (error) {
      console.error('Error getting entries:', error);
      return [];
    }
  }

  static async clearEntries() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ENTRIES);
      return true;
    } catch (error) {
      console.error('Error clearing entries:', error);
      return false;
    }
  }
}