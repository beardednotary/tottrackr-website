import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { StorageService } from '../services/storage';

export function LogScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [feedingType, setFeedingType] = useState(null);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    feedings: 0,
    wetDiapers: 0,
    dirtyDiapers: 0,
    sleep: 0
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const savedEntries = await StorageService.getEntries();
    setEntries(savedEntries);
    updateStats(savedEntries);
  };

  const addEntry = async (type, details = {}) => {
    const newEntry = {
      id: Date.now(),
      type,
      timestamp: new Date(),
      ...details
    };

    const success = await StorageService.saveEntry(newEntry);
    if (success) {
      setEntries([newEntry, ...entries]);
      updateStats([newEntry, ...entries]);
    }
  };

  const updateStats = (currentEntries) => {
    const today = new Date().toDateString();
    const todayEntries = currentEntries.filter(entry => 
      new Date(entry.timestamp).toDateString() === today
    );

    setStats({
      feedings: todayEntries.filter(e => e.type === 'feeding').length,
      wetDiapers: todayEntries.filter(e => e.type === 'wet').length,
      dirtyDiapers: todayEntries.filter(e => e.type === 'dirty').length,
      sleep: todayEntries.filter(e => e.type === 'sleep').length
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#E3F2FD' }]}
          onPress={() => addEntry('wet')}
        >
          <Text>Wet Diaper</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FFF3E0' }]}
          onPress={() => addEntry('dirty')}
        >
          <Text>Dirty Diaper</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#E8F5E9' }]}
          onPress={() => setModalVisible(true)}
        >
          <Text>Feeding</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Today's Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text>Feedings</Text>
            <Text style={styles.statNumber}>{stats.feedings}</Text>
          </View>
          <View style={styles.statItem}>
            <Text>Wet Diapers</Text>
            <Text style={styles.statNumber}>{stats.wetDiapers}</Text>
          </View>
          <View style={styles.statItem}>
            <Text>Dirty Diapers</Text>
            <Text style={styles.statNumber}>{stats.dirtyDiapers}</Text>
          </View>
          <View style={styles.statItem}>
            <Text>Sleep Sessions</Text>
            <Text style={styles.statNumber}>{stats.sleep}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.entriesList}>
        {entries.map(entry => (
          <View key={entry.id} style={styles.entryItem}>
            <View>
              <Text style={styles.entryType}>{entry.type}</Text>
              {entry.amount && (
                <Text style={styles.entryDetail}>{entry.amount} oz</Text>
              )}
            </View>
            <Text style={styles.entryTime}>
              {new Date(entry.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      <FeedingModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={addEntry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 8
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    margin: 16,
    borderRadius: 8
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4
  },
  entriesList: {
    flex: 1,
    padding: 16
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8
  },
  entryType: {
    fontSize: 16,
    fontWeight: '500'
  },
  entryDetail: {
    color: '#666'
  },
  entryTime: {
    color: '#666'
  }
});