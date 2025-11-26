import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';

interface FirstTimeTutorialProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width, height } = Dimensions.get('window');
const POINTER_LEFT_X = width * 0.25;
const POINTER_RIGHT_X = width * 0.75;

export function FirstTimeTutorial({ visible, onDismiss }: FirstTimeTutorialProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pointerAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Animate pointers
      Animated.loop(
        Animated.sequence([
          Animated.timing(pointerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pointerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const pointerScale = pointerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const pointerOpacity = pointerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fadeAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <BlurView intensity={80} tint="dark" style={styles.blurView}>
        <View style={styles.container}>
          {/* Left hand pointer */}
          <Animated.View
            style={[
              styles.pointerContainer,
              {
                left: POINTER_LEFT_X - 40,
                top: height * 0.4,
                transform: [{ scale: pointerScale }],
                opacity: pointerOpacity,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="hand-pointing-up"
              size={80}
              color={colors.tint}
              style={{ transform: [{ rotate: '-15deg' }] }}
            />
            <View style={[styles.pulse, { borderColor: colors.tint }]} />
          </Animated.View>

          {/* Right hand pointer */}
          <Animated.View
            style={[
              styles.pointerContainer,
              {
                right: width - POINTER_RIGHT_X - 40,
                top: height * 0.4,
                transform: [{ scale: pointerScale }],
                opacity: pointerOpacity,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="hand-pointing-up"
              size={80}
              color={colors.tint}
              style={{ transform: [{ rotate: '15deg' }] }}
            />
            <View style={[styles.pulse, { borderColor: colors.tint }]} />
          </Animated.View>

          {/* Instruction card */}
          <View style={styles.cardContainer}>
            <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="gesture-tap"
                  size={40}
                  color={colors.tint}
                />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                One-Handed Tracking
              </Text>

              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Tap on either side of the screen to log activities. TotTrackr automatically
                adapts to whichever hand you're using!
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                    name="hand-back-left"
                    size={24}
                    color={colors.tint}
                  />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                    Tap left side → Left-handed mode
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <MaterialCommunityIcons
                    name="hand-back-right"
                    size={24}
                    color={colors.tint}
                  />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                    Tap right side → Right-handed mode
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.tint }]}
                onPress={handleDismiss}
              >
                <Text style={styles.buttonText}>Got It!</Text>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  blurView: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    opacity: 0.3,
  },
  cardContainer: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(100, 150, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  featureList: {
    width: '100%',
    gap: 16,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});