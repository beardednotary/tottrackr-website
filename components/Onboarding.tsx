import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { StorageService } from '@/services/StorageService';
import * as Haptics from 'expo-haptics';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [birthWeight, setBirthWeight] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    if (step === 3 && !birthWeight.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    await StorageService.saveBabyProfile({
      id: Date.now().toString(),           
      name: name.trim(),
      dateOfBirth: dateOfBirth.getTime(),
      birthWeight: parseFloat(birthWeight) || undefined,
      createdAt: Date.now(),              
      updatedAt: Date.now(),               
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? ['#0F1115', '#0C0D11', '#08090C']
          : ['#E9ECF4', '#F6F8FC']
      }
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: s <= step ? colors.tint : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {step === 1 && (
              <>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="baby-face-outline"
                    size={80}
                    color={colors.tint}
                  />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>
                  Welcome to TotTrackr
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Let's get started by adding your baby's information
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Baby's Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundSecondary,
                      },
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Emma"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                  />
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="calendar-heart"
                    size={80}
                    color={colors.tint}
                  />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>
                  When was {name} born?
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  This helps us provide age-appropriate insights
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Date of Birth
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.dateButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: colors.text, fontSize: 18 }}>
                      {dateOfBirth.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <MaterialCommunityIcons
                      name="calendar"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={dateOfBirth}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDateOfBirth(selectedDate);
                      }}
                      maximumDate={new Date()}
                    />
                  )}
                </View>
              </>
            )}

            {step === 3 && (
              <>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="weight"
                    size={80}
                    color={colors.tint}
                  />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>
                  Birth Weight
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Track {name}'s growth from day one
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Weight (lbs)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundSecondary,
                      },
                    ]}
                    value={birthWeight}
                    onChangeText={setBirthWeight}
                    placeholder="e.g., 7.5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              </>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {step > 1 && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep(step - 1);
                }}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: colors.tint },
                ((step === 1 && !name.trim()) ||
                  (step === 3 && !birthWeight.trim())) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={
                (step === 1 && !name.trim()) ||
                (step === 3 && !birthWeight.trim())
              }
            >
              <Text style={styles.primaryButtonText}>
                {step === 3 ? 'Get Started' : 'Next'}
              </Text>
              <MaterialCommunityIcons
                name={step === 3 ? 'check' : 'arrow-right'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Skip option for birth weight */}
          {step === 3 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                setBirthWeight('7.5');
                handleComplete();
              }}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 48,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 8,
  },
  primaryButton: {
    flex: 2,
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});