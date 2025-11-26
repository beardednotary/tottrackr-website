import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageService, type SyncInfo } from '@/services/StorageService';
import { syncService } from '@/services/FirebaseConfig';

type SyncSettingsProps = {
  onClose?: () => void;
  tintColor?: string;
  backgroundColor?: string;
  textColor?: string;
};

export default function SyncSettings({
  onClose,
  tintColor = '#007AFF',
  backgroundColor = '#FFFFFF',
  textColor = '#000000',
}: SyncSettingsProps) {
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({
    enabled: false,
    lastSync: null,
    babyId: null,
  });
  const [babyName, setBabyName] = useState('');
  const [babyId, setBabyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState<'none' | 'create' | 'join'>('none');

  useEffect(() => {
    loadSyncInfo();
  }, []);

  const loadSyncInfo = async () => {
    try {
      const info = await StorageService.getSyncInfo();
      setSyncInfo(info);
    } catch (error) {
      console.error('Error loading sync info:', error);
    }
  };

  const handleCreateBaby = async () => {
    if (!babyName.trim()) {
      Alert.alert('Error', 'Please enter a baby name');
      return;
    }

    setLoading(true);
    try {
      const newBabyId = await syncService.createBabyProfile(babyName);
      await StorageService.enableSync(newBabyId);
      
      const entries = await StorageService.getEntries();
      if (entries.length > 0) {
        await syncService.syncAllEntries(entries, newBabyId);
      }

      Alert.alert('Success', `Sync enabled!\n\nBaby ID: ${newBabyId}`);
      setBabyName('');
      setSetupMode('none');
      await loadSyncInfo();
    } catch (error) {
      Alert.alert('Error', 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBaby = async () => {
    if (!babyId.trim()) {
      Alert.alert('Error', 'Please enter a Baby ID');
      return;
    }

    setLoading(true);
    try {
      const babyProfile = await syncService.getBabyProfile(babyId);
      if (!babyProfile) {
        Alert.alert('Error', 'Baby ID not found');
        return;
      }

      await StorageService.enableSync(babyId);
      const remoteEntries = await syncService.getEntries(babyId);

      Alert.alert('Success', `Connected! Downloaded ${remoteEntries.length} entries.`);
      setBabyId('');
      setSetupMode('none');
      await loadSyncInfo();
    } catch (error) {
      Alert.alert('Error', 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSync = () => {
    Alert.alert('Disable Sync', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          await StorageService.disableSync();
          syncService.stopListening();
          await loadSyncInfo();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color={tintColor} />
      </View>
    );
  }

  if (syncInfo.enabled) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.title, { color: textColor }]}>Sync Enabled</Text>
        <Text style={[styles.babyId, { color: textColor }]}>{syncInfo.babyId}</Text>
        <TouchableOpacity style={styles.button} onPress={handleDisableSync}>
          <Text style={styles.buttonText}>Disable Sync</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (setupMode === 'create') {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.title, { color: textColor }]}>Create Profile</Text>
        <TextInput
          style={[styles.input, { color: textColor, borderColor: tintColor }]}
          placeholder="Baby's Name"
          placeholderTextColor={textColor + '80'}
          value={babyName}
          onChangeText={setBabyName}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleCreateBaby}
        >
          <Text style={styles.buttonText}>Create & Enable Sync</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSetupMode('none')}>
          <Text style={[styles.linkText, { color: tintColor }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (setupMode === 'join') {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.title, { color: textColor }]}>Join Profile</Text>
        <TextInput
          style={[styles.input, { color: textColor, borderColor: tintColor }]}
          placeholder="Enter Baby ID"
          placeholderTextColor={textColor + '80'}
          value={babyId}
          onChangeText={setBabyId}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleJoinBaby}
        >
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSetupMode('none')}>
          <Text style={[styles.linkText, { color: tintColor }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Cloud Sync</Text>
      <Text style={[styles.subtitle, { color: textColor }]}>
        Sync your data across devices
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: tintColor }]}
        onPress={() => setSetupMode('create')}
      >
        <Text style={styles.buttonText}>Create New Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: tintColor }]}
        onPress={() => setSetupMode('join')}
      >
        <Text style={styles.buttonText}>Join Existing Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    opacity: 0.7,
  },
  babyId: {
    fontSize: 14,
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});