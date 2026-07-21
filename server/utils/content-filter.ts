/**
 * Server-Side UGC Content Filter
 * Deterministic Regex-based content filtering to comply with Apple App Store Review Guidelines.
 */

export interface FilterOptions {
  allowAddresses?: boolean;
  allowLinks?: boolean;
  allowPhones?: boolean;
}

export interface FilterResult {
  isClean: boolean;
  reason?: string;
}

function normalizeText(text: string, removeSpaces: boolean = false): string {
  if (!text) return '';
  let normalized = text
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b');

  if (removeSpaces) {
    normalized = normalized.replace(/[\s_.-]/g, '');
  }
  return normalized;
}

const RULES = {
  // Threats, physical harm, self-harm, weapons
  THREATS_VIOLENCE: /\b(kill|murder|suicide|slaughter|terrorist|terrorism|bomb|nazi|shoot|stab|gun|rifle)\b/i,
  // Hate attacks
  HATE_SPEECH: /\b(faggot|nigger|chink|spic|kike|dyke|retard)\b/i,
  // Sexual solicitation, escorts, minors
  SEXUAL_SOLICITATION: /\b(escort|prostitute|onlyfans|sugar daddy|sugar baby|hooker|child porn|cp|pedophile)\b/i,
  // Scams, spam, illegal activities
  SCAMS_SPAM: /\b(crypto(currency)? invest|buy weed|buy followers|buy likes|ponzi|pyramid scheme)\b/i,
  // Doxxing
  DOXXING_SSN: /\b(\d{3}-\d{2}-\d{4}|social security number|ssn)\b/i,
  // Links
  SUSPICIOUS_LINKS: /(https?:\/\/(?!samevibe\.app)[^\s]+)/i,
  // Phone numbers (simple US/International formats)
  PHONE_NUMBERS: /\b(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/i,
  // Home addresses (Very naive heuristic: numbers followed by Street, Ave, Blvd, etc)
  RESIDENTIAL_ADDRESS: /\b\d{1,5}\s+[a-z\s]+(street|st|avenue|ave|boulevard|blvd|drive|dr|lane|ln|road|rd)\b/i,
};

const HIGH_CONFIDENCE_SPACES_REMOVED = {
  SEXUAL: /(onlyfans|sugardaddy|buyfollowers|buyweed|childporn)/i
};

export function checkContent(text: string, options: FilterOptions = {}): FilterResult {
  if (!text) return { isClean: true };

  const withSpaces = normalizeText(text, false);
  const withoutSpaces = normalizeText(text, true);

  if (RULES.THREATS_VIOLENCE.test(withSpaces) || RULES.HATE_SPEECH.test(withSpaces)) {
    return { isClean: false, reason: "Content violates safety guidelines (violence/hate/threats)." };
  }

  if (RULES.SEXUAL_SOLICITATION.test(withSpaces) || HIGH_CONFIDENCE_SPACES_REMOVED.SEXUAL.test(withoutSpaces)) {
    return { isClean: false, reason: "Content violates policies against solicitation or illicit material." };
  }

  if (RULES.SCAMS_SPAM.test(withSpaces)) {
    return { isClean: false, reason: "Content violates commercial spam or scam policies." };
  }

  if (RULES.DOXXING_SSN.test(withSpaces)) {
    return { isClean: false, reason: "Content violates privacy policies (Doxxing)." };
  }

  if (!options.allowPhones && RULES.PHONE_NUMBERS.test(withSpaces)) {
    return { isClean: false, reason: "Content violates privacy policies (Phone Numbers)." };
  }

  if (!options.allowAddresses && RULES.RESIDENTIAL_ADDRESS.test(withSpaces)) {
    return { isClean: false, reason: "Content violates privacy policies (Residential Addresses)." };
  }

  if (!options.allowLinks && RULES.SUSPICIOUS_LINKS.test(withSpaces)) {
    return { isClean: false, reason: "Content violates policies against suspicious external links." };
  }

  return { isClean: true };
}

export function validateUGC(fields: (string | undefined | null)[], options: FilterOptions = {}): void {
  for (const field of fields) {
    if (field && typeof field === 'string') {
      const result = checkContent(field, options);
      if (!result.isClean) {
        const error = new Error(result.reason);
        (error as any).status = 422;
        throw error;
      }
    }
  }
}

import type { Request, Response, NextFunction } from 'express';

export function filterUGC(fieldsToScan: string[], options: FilterOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const values = fieldsToScan.map(field => req.body[field]);
      validateUGC(values, options);
      next();
    } catch (error: any) {
      if (error.status === 422) {
        return res.status(422).json({ message: error.message });
      }
      next(error);
    }
  };
}
