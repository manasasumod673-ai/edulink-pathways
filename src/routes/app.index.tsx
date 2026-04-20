import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LevelBadge } from "@/components/edulink/LevelBadge";
import { XpBar } from "@/components/edulink/XpBar";
import { Button } from "@/components/ui/button";
import { tierForLevel } from "@/lib/xp";
import { Sparkles, Trophy, Briefcase, Users, MessageSquare, BookOpen } from "lucide-react";

export const Route = createFileRoute("/app/")({ component: Dashboard });

type Profile = {
  display_name: string;
  total_xp: number;
  current_level: number;
  headline: string | null;
};

function Dashboard() {
  const { user, roles } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ projects: 0, badges: 0, posts: 0 });
  const isRecruiter = roles.includes("recruiter");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name,total_xp,current_level,headline")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p as Profile | null);
      const [{ count: projects }, { count: badges }, { count: posts }] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({ projects: projects ?? 0, badges: badges ?? 0, posts: posts ?? 0 });
    })();
  }, [user]);

  if (!profile) return <div className="text-muted-foreground">Loading…</div>;
  const tier = tierForLevel(profile.current_level);

  const quickLinks = isRecruiter
    ? [
        { to: "/app/opportunities", label: "Post Opportunity", icon: Briefcase },
        { to: "/app/leaderboard", label: "Discover Talent", icon: Trophy },
        { to: "/app/messages", label: "Messages", icon: MessageSquare },
      ]
    : [
        { to: "/app/roadmap", label: "AI Roadmap", icon: Sparkles },
        { to: "/app/opportunities", label: "Find Jobs", icon: Briefcase },
        { to: "/app/communities", label: "Communities", icon: Users },
        { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
        { to: "/app/profile", label: "My Profile", icon: BookOpen },
      ];

  return (
    <div className="space-y-8">
      <section
        className="rounded-3xl border border-border/60 p-8"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <LevelBadge level={profile.current_level} size="lg" />
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Welcome back,</div>
            <h1 className="text-3xl font-bold">{profile.display_name}</h1>
            <div className="mt-1 text-sm" style={{ color: tier.color }}>
              {tier.title} · Level {profile.current_level}
            </div>
            <div className="mt-4 max-w-md">
              <XpBar xp={profile.total_xp} />
            </div>
          </div>
          {!isRecruiter && (
            <Link to="/app/roadmap">
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <Sparkles className="mr-2 h-4 w-4" />
                Get AI Roadmap
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Projects", value: stats.projects },
          { label: "Badges", value: stats.badges },
          { label: "Posts", value: stats.posts },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary/60"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: "var(--gradient-primary)" }}
              >
                <l.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="font-medium">{l.label}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}