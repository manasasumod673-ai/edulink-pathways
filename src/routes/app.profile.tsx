import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LevelBadge } from "@/components/edulink/LevelBadge";
import { XpBar } from "@/components/edulink/XpBar";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

type Profile = {
  display_name: string;
  bio: string | null;
  headline: string | null;
  github_url: string | null;
  total_xp: number;
  current_level: number;
};
type Skill = { id: string; name: string };
type Project = { id: string; title: string; description: string | null; tech_stack: string[] | null };

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProj, setNewProj] = useState({ title: "", description: "", tech: "" });

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(p as Profile);
    const { data: ps } = await supabase
      .from("profile_skills")
      .select("skill_id, skills(id, name)")
      .eq("user_id", user.id);
    setMySkills(((ps ?? []) as Array<{ skills: Skill }>).map((r) => r.skills).filter(Boolean));
    const { data: s } = await supabase.from("skills").select("id, name").order("name");
    setAllSkills(s ?? []);
    const { data: pr } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setProjects(pr ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const saveProfile = async () => {
    if (!user || !profile) return;
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name,
      bio: profile.bio,
      headline: profile.headline,
      github_url: profile.github_url,
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const addSkill = async (skillId: string) => {
    if (!user) return;
    const { error } = await supabase.from("profile_skills").insert({ user_id: user.id, skill_id: skillId });
    if (error) return toast.error(error.message);
    await supabase.from("xp_events").insert({ user_id: user.id, amount: 25, reason: "Added a skill" });
    toast.success("+25 XP!");
    load();
  };

  const addProject = async () => {
    if (!user || !newProj.title) return;
    const tech = newProj.tech.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      title: newProj.title,
      description: newProj.description,
      tech_stack: tech,
    });
    if (error) return toast.error(error.message);
    await supabase.from("xp_events").insert({ user_id: user.id, amount: 100, reason: "Added a project" });
    toast.success("Project added! +100 XP");
    setNewProj({ title: "", description: "", tech: "" });
    load();
  };

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    load();
  };

  if (!profile) return <div>Loading…</div>;
  const availableSkills = allSkills.filter((s) => !mySkills.some((ms) => ms.id === s.id));

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="mb-4 text-xl font-bold">Edit profile</h2>
          <div className="space-y-4">
            <div>
              <Label>Display name</Label>
              <Input
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Headline</Label>
              <Input
                value={profile.headline ?? ""}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                placeholder="e.g. Full-stack developer learning AI"
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={profile.bio ?? ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>GitHub URL</Label>
              <Input
                value={profile.github_url ?? ""}
                onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
              />
            </div>
            <Button onClick={saveProfile} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              Save profile
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="mb-4 text-xl font-bold">Projects</h2>
          <div className="mb-4 grid gap-2 rounded-xl border border-border/60 bg-secondary/30 p-4">
            <Input
              placeholder="Project title"
              value={newProj.title}
              onChange={(e) => setNewProj({ ...newProj, title: e.target.value })}
            />
            <Textarea
              placeholder="What does it do?"
              rows={2}
              value={newProj.description}
              onChange={(e) => setNewProj({ ...newProj, description: e.target.value })}
            />
            <Input
              placeholder="Tech stack (comma separated)"
              value={newProj.tech}
              onChange={(e) => setNewProj({ ...newProj, tech: e.target.value })}
            />
            <Button onClick={addProject} size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add project (+100 XP)
            </Button>
          </div>
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="flex items-start justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <div className="font-bold">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(p.tech_stack ?? []).map((t) => (
                      <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteProject(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground">No projects yet. Add your first one!</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
          <LevelBadge level={profile.current_level} size="lg" />
          <div className="mt-4 text-2xl font-bold">{profile.total_xp} XP</div>
          <div className="mt-3"><XpBar xp={profile.total_xp} /></div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="mb-3 font-bold">My skills</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {mySkills.map((s) => (
              <span key={s.id} className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {s.name}
              </span>
            ))}
            {mySkills.length === 0 && <span className="text-sm text-muted-foreground">None yet</span>}
          </div>
          <Label className="text-xs text-muted-foreground">Add a skill</Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
            onChange={(e) => e.target.value && addSkill(e.target.value)}
            value=""
          >
            <option value="">Select…</option>
            {availableSkills.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}