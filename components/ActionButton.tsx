import React from 'react';
import { TouchableOpacity, Text, StyleSheet, useColorScheme, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';

type ActionButtonProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  isActive?: boolean;
  showLabel: boolean; // From user preference
};

export function ActionButton({
  icon,
  label,
  onPress,
  color,
  isActive = false,
  showLabel,
}: ActionButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: color,
          opacity: isActive ? 0.7 : 1,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Show either label OR icon */}
      {showLabel ? (
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
      ) : (
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      )}

      {/* Active indicator badge (for sleep timer) */}
      {isActive && (
        <View style={[styles.activeIndicator, { backgroundColor: color }]}>
          <MaterialCommunityIcons name="clock-outline" size={10} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    height: 72,
    borderRadius: 36, // Circular
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginVertical: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});