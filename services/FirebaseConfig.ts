import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
  Timestamp,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import type { Entry } from '../types';

// ===== FIREBASE CONFIG =====
// TODO: Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===== SYNC SERVICE =====
class SyncService {
  private unsubscribe: Unsubscribe | null = null;

  // Authenticate anonymously
  async authenticate(): Promise<string> {
    try {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user.uid;
    } catch (error) {
      console.error('[Firebase] Authentication error:', error);
      throw error;
    }
  }

  // Create or get baby profile
  async createBabyProfile(babyName: string): Promise<string> {
    try {
      const userId = await this.authenticate();
      const babyId = `baby_${Date.now()}`;
      
      await setDoc(doc(db, 'babies', babyId), {
        name: babyName,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log('[Firebase] Baby profile created:', babyId);
      return babyId;
    } catch (error) {
      console.error('[Firebase] Error creating baby profile:', error);
      throw error;
    }
  }

  // Sync an entry to Firebase
  async syncEntry(entry: Entry, babyId: string): Promise<void> {
    try {
      await setDoc(doc(db, 'babies', babyId, 'entries', entry.id), {
        ...entry,
        syncedAt: Timestamp.now(),
      });
      console.log('[Firebase] Entry synced:', entry.id);
    } catch (error) {
      console.error('[Firebase] Error syncing entry:', error);
      throw error;
    }
  }

  // Get all entries for a baby
  async getEntries(babyId: string): Promise<Entry[]> {
    try {
      const entriesRef = collection(db, 'babies', babyId, 'entries');
      const snapshot = await getDocs(entriesRef);
      
      const entries: Entry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          type: data.type,
          timestamp: data.timestamp,
          ...data,
        } as Entry);
      });

      console.log('[Firebase] Retrieved', entries.length, 'entries');
      return entries;
    } catch (error) {
      console.error('[Firebase] Error getting entries:', error);
      throw error;
    }
  }

  // Listen to real-time changes
  listenToEntries(
    babyId: string, 
    onUpdate: (entries: Entry[]) => void
  ): Unsubscribe {
    const entriesRef = collection(db, 'babies', babyId, 'entries');
    
    this.unsubscribe = onSnapshot(entriesRef, (snapshot: QuerySnapshot<DocumentData>) => {
      const entries: Entry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          type: data.type,
          timestamp: data.timestamp,
          ...data,
        } as Entry);
      });
      
      console.log('[Firebase] Real-time update:', entries.length, 'entries');
      onUpdate(entries);
    }, (error) => {
      console.error('[Firebase] Listener error:', error);
    });

    return this.unsubscribe;
  }

  // Stop listening
  stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log('[Firebase] Stopped listening');
    }
  }

  // Delete an entry
  async deleteEntry(babyId: string, entryId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'babies', babyId, 'entries', entryId));
      console.log('[Firebase] Entry deleted:', entryId);
    } catch (error) {
      console.error('[Firebase] Error deleting entry:', error);
      throw error;
    }
  }

  // Get baby profile
  async getBabyProfile(babyId: string): Promise<any> {
    try {
      const babyDoc = await getDoc(doc(db, 'babies', babyId));
      if (babyDoc.exists()) {
        return babyDoc.data();
      }
      return null;
    } catch (error) {
      console.error('[Firebase] Error getting baby profile:', error);
      throw error;
    }
  }

  // Sync all local entries to Firebase
  async syncAllEntries(entries: Entry[], babyId: string): Promise<void> {
    try {
      console.log('[Firebase] Syncing', entries.length, 'entries...');
      
      const syncPromises = entries.map(entry => this.syncEntry(entry, babyId));
      await Promise.all(syncPromises);
      
      console.log('[Firebase] All entries synced successfully');
    } catch (error) {
      console.error('[Firebase] Error syncing all entries:', error);
      throw error;
    }
  }
}

export const syncService = new SyncService();
export { db, auth };