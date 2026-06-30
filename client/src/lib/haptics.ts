import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Safely detect if we are in a native context where haptics work best
const isNative = () => {
  try {
    // @ts-ignore
    return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

/**
 * Trigger a light haptic impact (good for minor interactions like tabs, small buttons)
 */
export const hapticLight = async () => {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Ignore errors on non-supported platforms
  }
};

/**
 * Trigger a medium haptic impact (good for standard buttons, toggles)
 */
export const hapticMedium = async () => {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    // Ignore errors on non-supported platforms
  }
};

/**
 * Trigger a heavy haptic impact (good for major actions like Confirm, Join, Delete)
 */
export const hapticHeavy = async () => {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {
    // Ignore errors on non-supported platforms
  }
};

/**
 * Trigger a selection haptic (very subtle, good for scrolling picker wheels or sliding)
 */
export const hapticSelection = async () => {
  if (!isNative()) return;
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Trigger a success/error vibration pattern
 */
export const hapticNotification = async (type: 'SUCCESS' | 'WARNING' | 'ERROR') => {
  if (!isNative()) return;
  try {
    // @ts-ignore
    await Haptics.notification({ type });
  } catch (e) {
    // Ignore errors
  }
};
