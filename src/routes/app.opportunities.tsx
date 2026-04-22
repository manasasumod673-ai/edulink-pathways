import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Briefcase, CheckCircle2, Clock, Loader2, MapPin, Plus,
  Users, X, Github, Globe, CalendarCheck, XCircle, ArrowLeft,
} from "lucide-react";

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

type StudentProfile = {
  id: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
  github_url: string | null;
  website: string | null;
};

type Application = {
  id: string;
  opportunity_id: string;
  student_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  message: string | null;
  opportunity?: Opp;
  profile?: StudentProfile;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500",
  accepted: "bg-emerald-500/15 text-emerald-500",
  rejected: "bg-red-500/15 text-red-500",
};

type Tab = "browse" | "applied" | "applicants";

function Opps() {
  const { user, roles } = useAuth();
  const isRecruiter = roles.includes("recruiter");

  const [tab, setTab] = useState<Tab>("browse");
  const [opps, setOpps] = useState<Opp[]>([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    title: "", company: "", description: "", type: "internship",
    skills: "", min_level: 1, location: "", remote: true,
  });

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [recruiterApplications, setRecruiterApplications] = useState<Application[]>([]);

  // Detail panel state (recruiter)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOpps = () =>
    supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOpps((data ?? []) as Opp[]));

  const loadStudentApplications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("applications")
      .select("*, opportunity:opportunities(*)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setMyApplications(data as Application[]);
      setAppliedIds(new Set(data.map((a) => a.opportunity_id)));
    }
  };

  const loadRecruiterApplications = async () => {
    if (!user) return;
    const { data: oppData } = await supabase
      .from("opportunities").select("id").eq("recruiter_id", user.id);
    const oppIds = (oppData ?? []).map((o) => o.id);
    if (!oppIds.length) { setRecruiterApplications([]); return; }

    const { data } = await supabase
      .from("applications")
      .select("*, opportunity:opportunities(*)")
      .in("opportunity_id", oppIds)
      .order("created_at", { ascending: false });
    if (!data) return;

    const studentIds = [...new Set(data.map((a) => a.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, headline, avatar_url, username, bio, github_url, website")
      .in("id", studentIds);
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    const apps = data.map((a) => ({ ...a, profile: profileMap[a.student_id] })) as Application[];
    setRecruiterApplications(apps);
    // Keep selected panel in sync
    if (selectedApp) {
      const updated = apps.find((a) => a.id === selectedApp.id);
      if (updated) setSelectedApp(updated);
    }
  };

  useEffect(() => {
    loadOpps();
    if (isRecruiter) loadRecruiterApplications();
    else loadStudentApplications();
  }, [user, isRecruiter]);

  const post = async () => {
    if (!user) return;
    const { error } = await supabase.from("opportunities").insert({
      recruiter_id: user.id, title: form.title, company: form.company,
      description: form.description,
      type: form.type as "internship" | "challenge" | "job" | "project",
      required_skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      min_level: Number(form.min_level), location: form.location, remote: form.remote,
    });
    if (error) return toast.error(error.message);
    toast.success("Opportunity posted!");
    setForm({ title: "", company: "", description: "", type: "internship", skills: "", min_level: 1, location: "", remote: true });
    loadOpps();
  };

  const apply = async (oppId: string) => {
    if (!user || applyingId) return;
    setApplyingId(oppId);
    const { error } = await supabase.from("applications").insert({ opportunity_id: oppId, student_id: user.id });
    if (error) { toast.error(error.message); setApplyingId(null); return; }
    await supabase.from("xp_events").insert({ user_id: user.id, amount: 30, reason: "Applied to opportunity" });
    toast.success("Application sent! +30 XP");
    setApplyingId(null);
    await loadStudentApplications();
  };

  const updateStatus = async (appId: string, status: "accepted" | "rejected") => {
    setActionLoading(true);
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (error) { toast.error(error.message); setActionLoading(false); return; }
    toast.success(status === "accepted" ? "Application approved! Interview scheduled." : "Application rejected.");
    setActionLoading(false);
    await loadRecruiterApplications();
  };

  const filtered = opps.filter(
    (o) => !filter || o.title.toLowerCase().includes(filter.toLowerCase()) ||
      (o.required_skills ?? []).some((s) => s.toLowerCase().includes(filter.toLowerCase())),
  );

  const studentTabs = [
    { id: "browse" as Tab, label: "Browse", icon: <Briefcase className="h-4 w-4" /> },
    { id: "applied" as Tab, label: "Applied Jobs", icon: <Clock className="h-4 w-4" />, count: myApplications.length },
  ];
  const recruiterTabs = [
    { id: "browse" as Tab, label: "Opportunities", icon: <Briefcase className="h-4 w-4" /> },
    { id: "applicants" as Tab, label: "Applicants", icon: <Users className="h-4 w-4" />, count: recruiterApplications.length },
  ];
  const tabs = isRecruiter ? recruiterTabs : studentTabs;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Briefcase className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">{isRecruiter ? "Manage Opportunities" : "Opportunities"}</h1>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-xl border border-border/60 bg-card p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            onClick={() => { setTab(t.id); setSelectedApp(null); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs leading-none ${tab === t.id ? "bg-white/20 text-white" : "bg-primary/15 text-primary"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ──────────────────────────────────────────────────────── */}
      {tab === "browse" && (
        <div className="space-y-6">
          {isRecruiter && (
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Plus className="h-5 w-5" /> Post a new opportunity</h2>
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
          <Input placeholder="Filter by skill or title…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((o) => {
              const isApplied = appliedIds.has(o.id);
              const isApplying = applyingId === o.id;
              return (
                <div key={o.id} className="rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-lg">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs uppercase text-accent">{o.type}</span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Lv {o.min_level}+</span>
                    {isApplied && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" /> Applied
                      </span>
                    )}
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
                    {!isRecruiter && (
                      <Button size="sm" disabled={isApplied || !!applyingId} onClick={() => apply(o.id)}
                        className={isApplied ? "cursor-default bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/20" : ""}>
                        {isApplying ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Applying…</>
                          : isApplied ? <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Applied</> : "Apply"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="col-span-2 text-muted-foreground">No opportunities yet.</p>}
          </div>
        </div>
      )}

      {/* ── APPLIED JOBS TAB (Student) ──────────────────────────────────────── */}
      {tab === "applied" && !isRecruiter && (
        <div className="space-y-4">
          {myApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-16 text-center">
              <Clock className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No applications yet</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Browse opportunities and hit Apply to get started.</p>
              <Button variant="outline" className="mt-4" onClick={() => setTab("browse")}>Browse Opportunities</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myApplications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-lg">
                  {/* Interview scheduled banner */}
                  {app.status === "accepted" && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                      <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-500">Application Approved — Interview Scheduled</span>
                    </div>
                  )}
                  {app.status === "rejected" && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span className="text-xs font-semibold text-red-500">Application Not Selected</span>
                    </div>
                  )}
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{app.opportunity?.title ?? "—"}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[app.status]}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{app.opportunity?.company}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs uppercase text-accent">{app.opportunity?.type}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{app.opportunity?.remote ? "Remote" : app.opportunity?.location}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{app.opportunity?.description}</p>
                  <div className="mt-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    Applied {new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── APPLICANTS TAB (Recruiter) ─────────────────────────────────────── */}
      {tab === "applicants" && isRecruiter && !selectedApp && (
        <div className="space-y-4">
          {recruiterApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-16 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No applicants yet</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Students will appear here once they apply to your opportunities.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recruiterApplications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className="rounded-2xl border border-border/60 bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{app.profile?.display_name ?? app.student_id.slice(0, 8) + "…"}</div>
                      {app.profile?.headline && <div className="text-xs text-muted-foreground">{app.profile.headline}</div>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[app.status]}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{app.opportunity?.title}</span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Applied {new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── APPLICANT DETAIL PANEL (Recruiter) ────────────────────────────── */}
      {tab === "applicants" && isRecruiter && selectedApp && (
        <div className="space-y-6">
          {/* Back */}
          <button onClick={() => setSelectedApp(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to applicants
          </button>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Student Details Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-primary" /> Student Profile</h2>
              <div className="flex items-center gap-4">
                {selectedApp.profile?.avatar_url ? (
                  <img src={selectedApp.profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
                    {(selectedApp.profile?.display_name ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xl font-bold">{selectedApp.profile?.display_name ?? "Unknown"}</div>
                  {selectedApp.profile?.headline && <div className="text-sm text-muted-foreground">{selectedApp.profile.headline}</div>}
                  {selectedApp.profile?.username && <div className="text-xs text-muted-foreground">@{selectedApp.profile.username}</div>}
                </div>
              </div>
              {selectedApp.profile?.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedApp.profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-3">
                {selectedApp.profile?.github_url && (
                  <a href={selectedApp.profile.github_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary transition-colors">
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                )}
                {selectedApp.profile?.website && (
                  <a href={selectedApp.profile.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary transition-colors">
                    <Globe className="h-4 w-4" /> Portfolio
                  </a>
                )}
              </div>
              <div className="rounded-lg bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                Applied on {new Date(selectedApp.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>

            {/* Job Details Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Briefcase className="h-5 w-5 text-primary" /> Job Details</h2>
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs uppercase text-accent">{selectedApp.opportunity?.type}</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Lv {selectedApp.opportunity?.min_level}+</span>
                </div>
                <h3 className="text-xl font-bold">{selectedApp.opportunity?.title}</h3>
                <div className="text-sm text-muted-foreground">{selectedApp.opportunity?.company}</div>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {selectedApp.opportunity?.remote ? "Remote" : selectedApp.opportunity?.location}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedApp.opportunity?.description}</p>
              {(selectedApp.opportunity?.required_skills ?? []).length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Required Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedApp.opportunity?.required_skills ?? []).map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold">Current Status</div>
                <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[selectedApp.status]}`}>
                  {selectedApp.status === "accepted" ? "✓ Approved — Interview Scheduled" : selectedApp.status === "rejected" ? "✗ Rejected" : "⏳ Pending Review"}
                </span>
              </div>
              {selectedApp.status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    disabled={actionLoading}
                    onClick={() => updateStatus(selectedApp.id, "rejected")}
                    variant="outline"
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                  >
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                  <Button
                    disabled={actionLoading}
                    onClick={() => updateStatus(selectedApp.id, "accepted")}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Approve & Schedule Interview
                  </Button>
                </div>
              )}
              {selectedApp.status !== "pending" && (
                <p className="text-sm text-muted-foreground">This application has already been reviewed.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}