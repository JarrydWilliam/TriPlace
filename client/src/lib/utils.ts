import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function openExternalUrl(url: string) {
  try {
    // Try to use Capacitor Browser if available
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (e) {
    // Fallback for web or if plugin isn't installed
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
