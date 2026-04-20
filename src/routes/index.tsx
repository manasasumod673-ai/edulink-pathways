import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Navbar } from "@/components/edulink/Navbar";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Users, Briefcase, BookOpen, Zap, MessageSquare } from "lucide-react";
import { LevelBadge } from "@/components/edulink/LevelBadge";
import { XpBar } from "@/components/edulink/XpBar";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-border/40"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-accent" />
              <span>AI-powered learning · gamified XP · real recruiters</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
              Level up your skills,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                land the job.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              EduLink turns your learning journey into a game. Build projects, earn XP, unlock badges
              from Newbie to Pro (Level 1–35), and get discovered by recruiters who actually care
              about what you can build.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                >
                  Start as a Student
                </Button>
              </Link>
              <Link to="/auth/signup" search={{ role: "recruiter" }}>
                <Button size="lg" variant="outline">
                  I'm a Recruiter
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <div className="text-2xl font-bold text-foreground">35</div>
                <div>Levels</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-2xl font-bold text-foreground">8+</div>
                <div>Badges</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-2xl font-bold text-foreground">∞</div>
                <div>Opportunities</div>
              </div>
            </div>
          </div>
          {/* Mock profile card */}
          <div className="relative">
            <div
              className="rounded-3xl border border-border/60 bg-card/90 p-6 backdrop-blur"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-4">
                <LevelBadge level={18} size="lg" />
                <div>
                  <div className="text-xl font-bold">Alex Morgan</div>
                  <div className="text-sm text-muted-foreground">Full-stack apprentice · Skilled tier</div>
                </div>
              </div>
              <div className="mt-5">
                <XpBar xp={5400} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {["⚛️", "🐍", "🎨", "🚀", "🛠️", "🧠"].map((e, i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-xl border border-border/60 bg-secondary/40 text-2xl"
                  >
                    {e}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {["React", "TypeScript", "Node", "Postgres"].map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">Everything you need to level up</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Trophy, title: "XP & Levels", desc: "Earn XP from projects, posts, and challenges. Climb 35 levels from Newbie to Pro." },
            { icon: Sparkles, title: "AI Roadmaps", desc: "Get a personalized learning path built by AI based on your goal and current skills." },
            { icon: Briefcase, title: "Real Opportunities", desc: "Recruiters post internships, jobs, and challenges filtered by skill and level." },
            { icon: Users, title: "Communities", desc: "Join skill-based groups, share posts, and learn together with peers." },
            { icon: MessageSquare, title: "Direct Messaging", desc: "Chat with mentors, classmates, and recruiters in real time." },
            { icon: BookOpen, title: "Skill-Based Profiles", desc: "Showcase your projects, badges, and skill stack — built to impress." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 transition-all hover:border-primary/50"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "var(--gradient-primary)" }}
              >
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <Zap className="mx-auto mb-4 h-10 w-10 text-accent" />
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Your first 50 XP is one click away</h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            Create your profile, drop in a project, and watch your level climb.
          </p>
          <Link to="/auth/signup">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              Create your profile
            </Button>
          </Link>
        </div>
      </section>
      <footer className="border-t border-border/40 px-4 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EduLink — Built with passion.
      </footer>
    </div>
  );
}
