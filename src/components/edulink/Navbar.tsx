import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, Menu } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, signOut, roles } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isRecruiter = roles.includes("recruiter");
  const loggedLinks = isRecruiter
    ? [
        { to: "/app", label: "Dashboard" },
        { to: "/app/opportunities", label: "Opportunities" },
        { to: "/app/leaderboard", label: "Leaderboard" },
        { to: "/app/messages", label: "Messages" },
      ]
    : [
        { to: "/app", label: "Dashboard" },
        { to: "/app/opportunities", label: "Jobs" },
        { to: "/app/communities", label: "Communities" },
        { to: "/app/leaderboard", label: "Leaderboard" },
        { to: "/app/roadmap", label: "AI Roadmap" },
        { to: "/app/messages", label: "Messages" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg tracking-tight">EduLink</span>
        </Link>
        {user && (
          <nav className="hidden items-center gap-1 md:flex">
            {loggedLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/app/profile">
                <Button variant="ghost" size="sm">
                  Profile
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/" });
                }}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setOpen(!open)}
                aria-label="Menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/auth/signup">
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      {user && open && (
        <nav className="flex flex-col gap-1 border-t border-border/50 bg-background/95 p-2 md:hidden">
          {loggedLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}