import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/roadmap")({ component: RoadmapPage });

type Step = { title: string; description: string; resources?: string[]; xp?: number };
type Roadmap = { id: string; goal: string; content: { steps: Step[] }; created_at: string };

function RoadmapPage() {
  const { user } = useAuth();
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Roadmap[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("roadmaps").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems((data ?? []) as Roadmap[]);
  };

  useEffect(() => { load(); }, [user]);

  const generate = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-roadmap", { body: { goal } });
    setLoading(false);
    if (error) return toast.error(error.message);
    if ((data as { error?: string })?.error) return toast.error((data as { error: string }).error);
    toast.success("Roadmap generated!");
    setGoal("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-bold">AI Learning Roadmap</h1>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="mb-3 text-sm text-muted-foreground">Tell us your goal — we'll build a personalized step-by-step roadmap.</p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Become a full-stack developer in 6 months"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <Button onClick={generate} disabled={loading} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            {loading ? "Thinking…" : "Generate"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="mb-4 text-xl font-bold">🎯 {r.goal}</h2>
            <ol className="space-y-3">
              {(r.content?.steps ?? []).map((s, i) => (
                <li key={i} className="flex gap-4 rounded-xl border border-border/60 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground">{i + 1}</div>
                  <div>
                    <div className="font-bold">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.description}</div>
                    {s.resources && s.resources.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                        {s.resources.map((r, j) => <li key={j}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground">No roadmaps yet. Generate your first one above!</p>}
      </div>
    </div>
  );
}