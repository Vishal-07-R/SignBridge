import { SignClipItem, SignSequenceItem } from '../../types/avatar.ts';

// Standard 12 DEMO vocabulary items seeded in Stage 2
export const SUPPORTED_DEMO_SIGNS: Record<string, SignClipItem> = {
  HELLO: {
    id: 'HELLO',
    gloss: 'HELLO',
    category: 'GREETINGS',
    duration: 1.8,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Right hand rises to temple, open palm waving outward.',
    isSupported: true,
  },
  THANK_YOU: {
    id: 'THANK_YOU',
    gloss: 'THANK YOU',
    category: 'COURTESY',
    duration: 2.0,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Flat right hand fingertips touch chin, extend forward and down.',
    isSupported: true,
  },
  PLEASE: {
    id: 'PLEASE',
    gloss: 'PLEASE',
    category: 'COURTESY',
    duration: 1.9,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Open palm circular motion on upper chest.',
    isSupported: true,
  },
  NAME: {
    id: 'NAME',
    gloss: 'NAME',
    category: 'ESSENTIALS',
    duration: 1.8,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Both hands in H-shape, tapping across at chest level.',
    isSupported: true,
  },
  HELP: {
    id: 'HELP',
    gloss: 'HELP',
    category: 'ESSENTIALS',
    duration: 2.1,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Right fist rests on flat left palm, both elevate together.',
    isSupported: true,
  },
  YES: {
    id: 'YES',
    gloss: 'YES',
    category: 'RESPONSES',
    duration: 1.6,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. S-fist nodding up and down mimicking head nod.',
    isSupported: true,
  },
  NO: {
    id: 'NO',
    gloss: 'NO',
    category: 'RESPONSES',
    duration: 1.5,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Index and middle finger snap together against thumb with head shake.',
    isSupported: true,
  },
  WATER: {
    id: 'WATER',
    gloss: 'WATER',
    category: 'ESSENTIALS',
    duration: 1.8,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. W-handshape index taps chin twice.',
    isSupported: true,
  },
  GOOD: {
    id: 'GOOD',
    gloss: 'GOOD',
    category: 'DESCRIPTORS',
    duration: 1.7,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Right flat hand or thumb up moves forward from mouth/chest.',
    isSupported: true,
  },
  WELCOME: {
    id: 'WELCOME',
    gloss: 'WELCOME',
    category: 'GREETINGS',
    duration: 2.0,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Both open palms sweep inward toward chest.',
    isSupported: true,
  },
  SIGN: {
    id: 'SIGN',
    gloss: 'SIGN',
    category: 'COMMUNICATION',
    duration: 2.2,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Index fingers rotate alternately in front of torso.',
    isSupported: true,
  },
  FRIEND: {
    id: 'FRIEND',
    gloss: 'FRIEND',
    category: 'RELATIONSHIPS',
    duration: 2.0,
    isDemo: true,
    isReviewed: false,
    linguistNotes: 'Demo seed - needs linguist review. Index fingers hook together and alternate interlocking.',
    isSupported: true,
  },
};

/**
 * Normalizes a raw input gloss/word to match standard vocabulary keys.
 */
export function normalizeSignKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

/**
 * Checks whether a given sign is supported in the verified vocabulary dictionary.
 */
export function isSignSupported(rawKey: string): boolean {
  const key = normalizeSignKey(rawKey);
  return Boolean(SUPPORTED_DEMO_SIGNS[key]);
}

/**
 * Retrieves sign clip metadata for a given sign ID or returns null if unsupported.
 * Strictly adheres to Honesty Rule 2: Never returns a dummy/random clip for missing signs.
 */
export function getSignClip(rawKey: string): SignClipItem | null {
  const key = normalizeSignKey(rawKey);
  return SUPPORTED_DEMO_SIGNS[key] || null;
}

/**
 * Transforms an array of gloss strings into an ordered animation sequence with cumulative timing.
 * If an item is unsupported, marks isSupported: false with an explicit warning message.
 */
export function buildSignSequence(glosses: string[]): SignSequenceItem[] {
  let currentTime = 0;
  return glosses.map((raw) => {
    const key = normalizeSignKey(raw);
    const clip = SUPPORTED_DEMO_SIGNS[key];

    if (!clip) {
      const duration = 1.5; // Display pause duration for unsupported warning
      const item: SignSequenceItem = {
        id: key || 'UNKNOWN',
        gloss: raw.toUpperCase(),
        isSupported: false,
        duration,
        startTime: currentTime,
        endTime: currentTime + duration,
        isDemo: true,
        linguistReviewRequired: true,
        unsupportedMessage: `Unsupported sign "${raw.toUpperCase()}". Not in verified ISL dictionary.`,
      };
      currentTime += duration;
      return item;
    }

    const item: SignSequenceItem = {
      id: clip.id,
      gloss: clip.gloss,
      isSupported: true,
      duration: clip.duration,
      startTime: currentTime,
      endTime: currentTime + clip.duration,
      isDemo: clip.isDemo,
      linguistReviewRequired: !clip.isReviewed,
    };
    currentTime += clip.duration;
    return item;
  });
}
