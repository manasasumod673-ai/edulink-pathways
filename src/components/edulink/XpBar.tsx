import { progressToNextLevel, tierForLevel } from "@/lib/xp";

export function XpBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const { level, pct, current, next } = progressToNextLevel(xp);
  const tier = tierForLevel(level);
  return (
    <div className="w-full">
      {!compact && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Lv {level} · <span style={{ color: tier.color }}>{tier.title}</span>
          </span>
          <span className="text-muted-foreground">
            {xp - current} / {next - current} XP
          </span>
        </div>
      )}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "var(--gradient-xp)",
            boxShadow: "0 0 12px oklch(0.82 0.17 80 / 0.6)",
          }}
        />
      </div>
    </div>
  );
}