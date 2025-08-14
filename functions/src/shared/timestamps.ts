// Cross-runtime timestamp helpers for Firestore
// Works with:
// - JS Date
// - React Native Firebase Timestamp (has toDate())
// - Firebase Admin Timestamp (has toDate())
// - Plain objects with { seconds, nanoseconds }

export type AnyTimestamp =
  | Date
  | { toDate: () => Date }
  | { seconds: number; nanoseconds?: number };

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null;

export function isTimestampLike(v: unknown): v is AnyTimestamp {
  if (!isObj(v)) return false;
  // RNFirebase / Admin Timestamp
  if (typeof (v as any).toDate === 'function') return true;
  // Plain seconds/nanos
  if (typeof (v as any).seconds === 'number') return true;
  return v instanceof Date;
}

export function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (isObj(v) && typeof (v as any).toDate === 'function') {
    try {
      return (v as any).toDate();
    } catch {}
  }
  if (isObj(v) && typeof (v as any).seconds === 'number') {
    const sec = (v as any).seconds as number;
    const ns = typeof (v as any).nanoseconds === 'number' ? (v as any).nanoseconds : 0;
    return new Date(sec * 1000 + Math.floor(ns / 1e6));
  }
  return null;
}

export function ensureDate(v: unknown, fallback: Date = new Date(0)): Date {
  return toDate(v) ?? fallback;
}

export function toMillis(v: unknown): number | null {
  const d = toDate(v);
  return d ? d.getTime() : null;
}

export function compareTimestampDesc(a: unknown, b: unknown): number {
  const am = toMillis(a) ?? 0;
  const bm = toMillis(b) ?? 0;
  return bm - am; // for newest-first sorting
}
