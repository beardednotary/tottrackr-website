import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
  useColorScheme,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/Colors';
import { GlassCard } from '@/components/GlassCard';
import * as Haptics from 'expo-haptics';

export function ShareTotTrackr() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showQR, setShowQR] = useState(false);

  // UTM parameters for tracking
  const getShareUrl = (source: string) => {
    const baseUrl = 'https://tottrackr.com';
    const utmParams = `?utm_source=${source}&utm_medium=referral&utm_campaign=user_share`;
    return `${baseUrl}${utmParams}`;
  };

  // Smart app store link based on device
  const getAppStoreLink = () => {
    if (Platform.OS === 'ios') {
      return 'https://apps.apple.com/app/tottrackr/id[YOUR_APP_ID]'; // Replace with real ID after approval
    } else {
      return 'https://play.google.com/store/apps/details?id=com.tottrackr'; // Replace with real package name
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const message = Platform.select({
      ios: `I'm using TotTrackr to track my baby's care and it's amazing! One-handed operation is a game-changer. 🍼\n\n${getShareUrl('ios_share')}`,
      android: `I'm using TotTrackr to track my baby's care and it's amazing! One-handed operation is a game-changer. 🍼\n\n${getShareUrl('android_share')}`,
      default: `Check out TotTrackr - the baby tracker designed for one hand!\n\n${getShareUrl('app_share')}`,
    });

    try {
      const result = await Share.share({
        message,
        title: 'Try TotTrackr',
      });

      if (result.action === Share.sharedAction) {
        // Track successful share (optional - add analytics here)
        console.log('[Share] User shared successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to share. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(getShareUrl('copy_link'));
    Alert.alert('Copied!', 'Link copied to clipboard');
  };

  const toggleQR = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQR(!showQR);
  };

  return (
    <View style={styles.container}>
      <GlassCard style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint }]}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Share TotTrackr</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Help other parents track smarter
            </Text>
          </View>
        </View>

        {/* Share Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={handleShare}
          >
            <MaterialCommunityIcons name="share" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Share with Friends</Text>
          </TouchableOpacity>

          <View style={styles.secondaryButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleCopyLink}
            >
              <MaterialCommunityIcons name="content-copy" size={18} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Copy Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={toggleQR}
            >
              <MaterialCommunityIcons 
                name={showQR ? "qrcode-remove" : "qrcode"} 
                size={18} 
                color={colors.text} 
              />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                {showQR ? 'Hide QR' : 'Show QR'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Code */}
        {showQR && (
          <View style={[styles.qrContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <QRCode
              value={getShareUrl('qr_code')}
              size={200}
              backgroundColor="white"
              color="black"
            />
            <Text style={[styles.qrText, { color: colors.textSecondary }]}>
              Scan to download TotTrackr
            </Text>
          </View>
        )}

        {/* Why Share */}
        <View style={[styles.whyShare, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.whyShareTitle, { color: colors.text }]}>
            Why share TotTrackr?
          </Text>
          <Text style={[styles.whyShareText, { color: colors.textSecondary }]}>
            Help other exhausted parents discover one-handed baby tracking. Every share means the world to us! 💙
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  card: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  buttonGroup: {
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  qrText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  whyShare: {
    padding: 16,
    borderRadius: 12,
  },
  whyShareTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  whyShareText: {
    fontSize: 13,
    lineHeight: 18,
  },
});