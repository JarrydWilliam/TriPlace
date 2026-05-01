import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function openExternalUrl(url: string) {
    // Use standard window.open for web-based beta testing to avoid build issues
  window.open(url, '_blank', 'noopener,noreferrer');
}
