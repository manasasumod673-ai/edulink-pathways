import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Briefcase, MapPin, Plus } from "lucide-react";

export const Route = createFileRoute("/app/opportunities")({ component: Opps });

type Opp = {
  id: string;
  title: string;
  company: string | null;
  description: string | null;
  type: string;
  required_skills: string[] | null;
  min_level: number;
  location: string | null;
  remote: boolean;
  xp_reward: number;
  recruiter_id: string;
};

function Opps() {
  const { user, roles } = useAuth();
  const isRecruiter = roles.includes("recruiter");
  const [opps, setOpps] = useState<Opp[]>([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    title: "", company: "", description: "", type: "internship", skills: "", min_level: 1, location: "", remote: true,
  });

  const load = () =>
    supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOpps((data ?? []) as Opp[]));

  useEffect(() => {
    load();
  }, []);

  const post = async () => {
    if (!user) return;
    const { error } = await supabase.from("opportunities").insert({
      recruiter_id: user.id,
      title: form.title,
      company: form.company,
      description: form.description,
      type: form.type as "internship" | "challenge" | "job" | "project",
      required_skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      min_level: Number(form.min_level),
      location: form.location,
      remote: form.remote,
    });
    if (error) return toast.error(error.message);
    toast.success("Opportunity posted!");
    setForm({ title: "", company: "", description: "", type: "internship", skills: "", min_level: 1, location: "", remote: true });
    load();
  };

  const apply = async (oppId: string) => {
    if (!user) return;
    const { error } = await supabase.from("applications").insert({ opportunity_id: oppId, student_id: user.id });
    if (error) return toast.error(error.message);
    await supabase.from("xp_events").insert({ user_id: user.id, amount: 30, reason: "Applied to opportunity" });
    toast.success("Application sent! +30 XP");
  };

  const filtered = opps.filter(
    (o) =>
      !filter ||
      o.title.toLowerCase().includes(filter.toLowerCase()) ||
      (o.required_skills ?? []).some((s) => s.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">{isRecruiter ? "Manage Opportunities" : "Opportunities"}</h1>
        </div>
        <Input
          placeholder="Filter by skill or title…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isRecruiter && (
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Plus className="h-5 w-5" /> Post a new opportunity
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="internship">Internship</option>
                <option value="job">Job</option>
                <option value="challenge">Challenge</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div><Label>Min level (1–35)</Label><Input type="number" min={1} max={35} value={form.min_level} onChange={(e) => setForm({ ...form, min_level: Number(e.target.value) })} /></div>
            <div className="md:col-span-2"><Label>Required skills (comma separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, TypeScript" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <Button onClick={post} className="mt-4 bg-gradient-to-r from-primary to-accent text-primary-foreground">Post</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs uppercase text-accent">{o.type}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Lv {o.min_level}+</span>
            </div>
            <h3 className="text-lg font-bold">{o.title}</h3>
            <div className="text-sm text-muted-foreground">{o.company}</div>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{o.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(o.required_skills ?? []).map((s) => (
                <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{s}</span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {o.remote ? "Remote" : o.location}
              </span>
              {!isRecruiter && <Button size="sm" onClick={() => apply(o.id)}>Apply</Button>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground">No opportunities yet.</p>}
      </div>
    </div>
  );
}