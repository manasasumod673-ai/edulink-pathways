import { tierForLevel } from "@/lib/xp";

export function LevelBadge({ level, size = "md" }: { level: number; size?: "sm" | "md" | "lg" }) {
  const tier = tierForLevel(level);
  const dims =
    size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-16 w-16 text-base" : "h-12 w-12 text-xs";
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full font-bold ${dims}`}
      style={{
        background: `conic-gradient(from 0deg, ${tier.color}, oklch(0.7 0.22 300), ${tier.color})`,
        boxShadow: `0 0 18px ${tier.color}`,
      }}
    >
      <div className="flex h-[85%] w-[85%] flex-col items-center justify-center rounded-full bg-card">
        <span className="leading-none text-muted-foreground">LV</span>
        <span className="leading-none text-foreground">{level}</span>
      </div>
    </div>
  );
}