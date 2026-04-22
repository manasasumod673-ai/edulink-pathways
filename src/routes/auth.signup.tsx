import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/edulink/Navbar";
import { GraduationCap, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
  validateSearch: (s: Record<string, unknown>) => ({
    role: (s.role === "recruiter" ? "recruiter" : "student") as "student" | "recruiter",
  }),
});

function SignupPage() {
  const { role: initialRole } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<"student" | "recruiter">(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in → go straight to app
  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/app" });
  }, [user, authLoading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: name, role },
      },
    });
    if (error) {
      if (error.message?.toLowerCase().includes("email rate limit") ||
          (error as any)?.code === "over_email_send_rate_limit") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
          setLoading(false);
          setName(""); setEmail(""); setPassword("");
          toast.success("Account created! Welcome to EduLink.");
          navigate({ to: "/app" });
          return;
        }
      }
      setLoading(false);
      return toast.error(error.message);
    }
    setName(""); setEmail(""); setPassword("");
    setLoading(false);
    toast.success("Account created! Welcome to EduLink.");
    navigate({ to: "/app" });
  };

  if (authLoading || user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div
          className="rounded-2xl border border-border/60 bg-card p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h1 className="mb-1 text-2xl font-bold">Join EduLink</h1>
          <p className="mb-6 text-sm text-muted-foreground">Choose your path to get started.</p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            {[
              { val: "student" as const, label: "Student", icon: GraduationCap },
              { val: "recruiter" as const, label: "Recruiter", icon: Briefcase },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setRole(opt.val)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  role === opt.val
                    ? "border-primary bg-primary/10"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <opt.icon className={`h-6 w-6 ${role === opt.val ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              {loading ? "Creating account…" : `Create ${role} account`}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}