import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LevelBadge } from "@/components/edulink/LevelBadge";
import { XpBar } from "@/components/edulink/XpBar";
import { tierForLevel } from "@/lib/xp";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/app/leaderboard")({ component: Leaderboard });

type Row = { id: string; display_name: string; headline: string | null; total_xp: number; current_level: number };

function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, display_name, headline, total_xp, current_level")
      .order("total_xp", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-warning" />
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const tier = tierForLevel(r.current_level);
          return (
            <div
              key={r.id}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4"
              style={i < 3 ? { boxShadow: "var(--shadow-glow)" } : undefined}
            >
              <div className="w-8 text-center text-xl font-bold text-muted-foreground">#{i + 1}</div>
              <LevelBadge level={r.current_level} size="md" />
              <div className="flex-1">
                <div className="font-bold">{r.display_name}</div>
                <div className="text-xs" style={{ color: tier.color }}>{tier.title}</div>
                <div className="mt-1.5 max-w-sm"><XpBar xp={r.total_xp} compact /></div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{r.total_xp}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-muted-foreground">No users yet.</p>}
      </div>
    </div>
  );
}