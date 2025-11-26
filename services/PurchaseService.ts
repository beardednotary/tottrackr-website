// services/PurchaseService.ts
import Purchases, { PurchasesOffering, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEYS = {
  apple: 'test_EBxCHObAFigqGDXqtoNEPMcbcmo',
  google: 'test_EBxCHObAFigqGDXqtoNEPMcbcmo', // Use same for now
};

// Your product identifiers
const PRODUCT_IDS = {
  PREMIUM_LIFETIME: 'premium_lifetime',
};

// Your entitlement identifier (from RevenueCat)
const ENTITLEMENT_ID = 'premium';

export class PurchaseService {
  private static isConfigured = false;

  /**
   * Initialize RevenueCat SDK
   * Call this once on app startup
   */
  static async configure(userId?: string): Promise<void> {
    if (this.isConfigured) return;

    try {
      const apiKey = Platform.select({
        ios: API_KEYS.apple,
        android: API_KEYS.google,
      });

      if (!apiKey) {
        console.error('[Purchases] No API key for platform');
        return;
      }

      // Configure SDK
      Purchases.configure({ apiKey, appUserID: userId });

      // Enable debug logs in development
      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }

      this.isConfigured = true;
      console.log('[Purchases] SDK configured');
    } catch (error) {
      console.error('[Purchases] Configuration failed:', error);
    }
  }

  /**
   * Check if user has premium access
   */
  static async isPremium(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      console.log('[Purchases] Premium status:', hasPremium);
      return hasPremium;
    } catch (error) {
      console.error('[Purchases] isPremium check failed:', error);
      return false;
    }
  }

  /**
   * Get available offerings
   */
  static async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        console.log('[Purchases] Current offering:', offerings.current.identifier);
        return offerings.current;
      }
      
      console.log('[Purchases] No current offering found');
      return null;
    } catch (error) {
      console.error('[Purchases] getOfferings failed:', error);
      return null;
    }
  }

  /**
   * Purchase premium lifetime access
   */
  static async purchasePremium(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    try {
      // Get current offering
      const offering = await this.getOfferings();
      
      if (!offering) {
        return {
          success: false,
          error: 'No offering available. Please try again later.',
        };
      }

      // Find the lifetime package
      const lifetimePackage = offering.availablePackages.find(
        pkg => pkg.product.identifier === PRODUCT_IDS.PREMIUM_LIFETIME
      ) || offering.availablePackages[0]; // Fallback to first package

      if (!lifetimePackage) {
        return {
          success: false,
          error: 'Premium product not found.',
        };
      }

      console.log('[Purchases] Purchasing:', lifetimePackage.product.identifier);

      // Make purchase
      const { customerInfo } = await Purchases.purchasePackage(lifetimePackage);

      // Check if purchase was successful
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (hasPremium) {
        console.log('[Purchases] Purchase successful!');
        return { success: true, customerInfo };
      } else {
        return {
          success: false,
          error: 'Purchase completed but premium access not granted.',
        };
      }
    } catch (error: any) {
      console.error('[Purchases] Purchase failed:', error);

      // Handle user cancellation
      if (error.userCancelled) {
        return {
          success: false,
          error: 'Purchase cancelled',
        };
      }

      return {
        success: false,
        error: error.message || 'Purchase failed. Please try again.',
      };
    }
  }

  /**
   * Restore previous purchases
   */
  static async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    try {
      console.log('[Purchases] Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();

      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (hasPremium) {
        console.log('[Purchases] Restore successful!');
        return { success: true, customerInfo };
      } else {
        return {
          success: false,
          error: 'No previous purchases found.',
        };
      }
    } catch (error: any) {
      console.error('[Purchases] Restore failed:', error);
      return {
        success: false,
        error: error.message || 'Restore failed. Please try again.',
      };
    }
  }

  /**
   * Get customer info (for debugging)
   */
  static async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('[Purchases] getCustomerInfo failed:', error);
      return null;
    }
  }

  /**
   * Sync premium status with local storage
   */
  static async syncPremiumStatus(): Promise<boolean> {
    const isPremium = await this.isPremium();
    // You can save to AsyncStorage here if needed
    return isPremium;
  }
}