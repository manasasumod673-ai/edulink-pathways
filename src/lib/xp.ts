// Level system: Newbie -> Pro, Levels 1-35
// Formula matches DB trigger: level = floor(sqrt(xp/50)) + 1, capped 35

export function levelFromXp(xp: number): number {
  return Math.min(35, Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1));
}

export function xpForLevel(level: number): number {
  // Inverse: xp = (level - 1)^2 * 50
  const l = Math.max(1, Math.min(35, level));
  return Math.pow(l - 1, 2) * 50;
}

export function progressToNextLevel(xp: number): {
  level: number;
  current: number;
  next: number;
  progress: number; // 0..1
  pct: number; // 0..100
} {
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - current);
  const into = Math.max(0, xp - current);
  const progress = Math.min(1, into / span);
  return { level, current, next, progress, pct: Math.round(progress * 100) };
}

export const LEVEL_TIERS: { min: number; max: number; title: string; color: string }[] = [
  { min: 1, max: 4, title: "Newbie", color: "oklch(0.78 0.19 145)" },
  { min: 5, max: 9, title: "Apprentice", color: "oklch(0.82 0.17 80)" },
  { min: 10, max: 14, title: "Builder", color: "oklch(0.78 0.18 195)" },
  { min: 15, max: 19, title: "Skilled", color: "oklch(0.7 0.22 300)" },
  { min: 20, max: 24, title: "Advanced", color: "oklch(0.7 0.22 25)" },
  { min: 25, max: 29, title: "Expert", color: "oklch(0.75 0.2 350)" },
  { min: 30, max: 35, title: "Pro", color: "oklch(0.85 0.2 60)" },
];

export function tierForLevel(level: number) {
  return LEVEL_TIERS.find((t) => level >= t.min && level <= t.max) ?? LEVEL_TIERS[0];
}