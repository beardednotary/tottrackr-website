// app/profiles.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { StorageService } from '@/services/StorageService';
import { GlassCard } from '@/components/GlassCard';
import { Colors } from '@/constants/Colors';
import { PremiumGate } from '@/components/PremiumGate';
import type { BabyProfile } from '@/types';

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [profiles, setProfiles] = useState<BabyProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BabyProfile | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [birthWeight, setBirthWeight] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const allProfiles = await StorageService.getAllBabyProfiles();
    setProfiles(allProfiles);

    const activeId = await StorageService.getActiveBabyId();
    setActiveProfileId(activeId);
  };

  const getAgeString = (dateOfBirth: number): string => {
    const ageMs = Date.now() - dateOfBirth;
    const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (days < 30) return `${days} days old`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months old`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} old`;
  };

  const handleSwitchProfile = async (profileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await StorageService.setActiveBabyId(profileId);
    setActiveProfileId(profileId);
    Alert.alert('Success', 'Switched active baby profile!');
  };

  const handleAddProfile = () => {
    setName('');
    setDateOfBirth(new Date());
    setBirthWeight('');
    setShowAddModal(true);
  };

  const handleEditProfile = (profile: BabyProfile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setDateOfBirth(new Date(profile.dateOfBirth));
    setBirthWeight(profile.birthWeight?.toString() || '');
    setShowEditModal(true);
  };

  const handleSaveNewProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', "Please enter baby's name");
      return;
    }

    const newProfile: BabyProfile = {
      id: Date.now().toString(),
      name: name.trim(),
      dateOfBirth: dateOfBirth.getTime(),
      birthWeight: birthWeight ? parseFloat(birthWeight) : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await StorageService.saveBabyProfile(newProfile);
    
    // If this is the first profile, make it active
    if (profiles.length === 0) {
      await StorageService.setActiveBabyId(newProfile.id);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    loadProfiles();
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile || !name.trim()) return;

    const updated: BabyProfile = {
      ...editingProfile,
      name: name.trim(),
      dateOfBirth: dateOfBirth.getTime(),
      birthWeight: birthWeight ? parseFloat(birthWeight) : undefined,
      updatedAt: Date.now(),
    };

    await StorageService.saveBabyProfile(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowEditModal(false);
    setEditingProfile(null);
    loadProfiles();
  };

  const handleDeleteProfile = async (profile: BabyProfile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${profile.name}'s profile? This will also delete all associated tracking data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteBabyProfile(profile.id);
            
            // If deleted profile was active, switch to first remaining profile
            if (profile.id === activeProfileId) {
              const remaining = profiles.filter(p => p.id !== profile.id);
              if (remaining.length > 0) {
                await StorageService.setActiveBabyId(remaining[0].id);
              }
            }

            loadProfiles();
          },
        },
      ]
    );
  };

  const renderProfileForm = (isEdit: boolean) => (
    <View style={styles.form}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Name</Text>
      <TextInput
        style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
        value={name}
        onChangeText={setName}
        placeholder="Baby's name"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Date of Birth</Text>
      <TouchableOpacity
        style={[styles.formInput, { borderColor: colors.border }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: colors.text }}>
          {dateOfBirth.toLocaleDateString()}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setDateOfBirth(date);
          }}
        />
      )}

      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
        Birth Weight (lbs) - Optional
      </Text>
      <TextInput
        style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
        value={birthWeight}
        onChangeText={setBirthWeight}
        placeholder="7.5"
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
      />

      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => {
            isEdit ? setShowEditModal(false) : setShowAddModal(false);
            setEditingProfile(null);
          }}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={isEdit ? handleUpdateProfile : handleSaveNewProfile}
        >
          <Text style={styles.saveButtonText}>
            {isEdit ? 'Update' : 'Add Baby'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Baby Profiles</Text>
          </View>

          <View style={{ width: 44 }} />
        </View>

        <PremiumGate feature="Multiple Babies">
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >
{profiles.map((profile) => {
  const cardStyle = profile.id === activeProfileId 
    ? { 
        ...styles.profileCard, 
        borderColor: colors.tint, 
        borderWidth: 2 
      }
    : styles.profileCard;

  return (
    <GlassCard
      key={profile.id}
      style={cardStyle}
    >
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <View style={styles.profileNameRow}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profile.name}
            </Text>
            {profile.id === activeProfileId && (
              <View style={[styles.activeBadge, { backgroundColor: colors.tint }]}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={[styles.profileAge, { color: colors.textSecondary }]}>
            Born: {new Date(profile.dateOfBirth).toLocaleDateString()}
          </Text>
          <Text style={[styles.profileAge, { color: colors.textSecondary }]}>
            {getAgeString(profile.dateOfBirth)}
          </Text>
          {profile.birthWeight && (
            <Text style={[styles.profileAge, { color: colors.textSecondary }]}>
              Birth weight: {profile.birthWeight.toFixed(2)} lbs
            </Text>
          )}
        </View>

        <MaterialCommunityIcons
          name="baby-face"
          size={48}
          color={colors.tint}
          style={{ opacity: 0.3 }}
        />
      </View>

      <View style={styles.profileActions}>
        {profile.id !== activeProfileId && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={() => handleSwitchProfile(profile.id)}
          >
            <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Switch</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={() => handleEditProfile(profile)}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={16}
            color={colors.text}
          />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>
            Edit
          </Text>
        </TouchableOpacity>

        {profiles.length > 1 && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.error + '20' },
            ]}
            onPress={() => handleDeleteProfile(profile)}
          >
            <MaterialCommunityIcons name="delete" size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
})}

            {/* Add Profile Button */}
            <TouchableOpacity
              style={[styles.addButton, { borderColor: colors.border }]}
              onPress={handleAddProfile}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={colors.tint} />
              <Text style={[styles.addButtonText, { color: colors.text }]}>
                Add Another Baby
              </Text>
            </TouchableOpacity>

            {/* Info */}
            <GlassCard style={styles.infoCard}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Each baby has separate tracking data. Switch between profiles to view or log
                activities for different children.
              </Text>
            </GlassCard>
          </ScrollView>
        </PremiumGate>
      </LinearGradient>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Baby</Text>
            {renderProfileForm(false)}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
            {renderProfileForm(true)}
          </View>
        </View>
      </Modal>
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
  profileCard: {
    padding: 20,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileAge: {
    fontSize: 14,
    marginTop: 2,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: -8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});