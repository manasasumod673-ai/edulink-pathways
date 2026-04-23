import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Plus } from "lucide-react";

export const Route = createFileRoute("/app/communities")({ component: Communities });

type Community = { id: string; name: string; slug: string; description: string | null; icon: string | null };
type Post = { id: string; content: string; user_id: string; created_at: string; community_id: string | null; profiles?: { display_name: string } };

function Communities() {
  const { user } = useAuth();
  const [comms, setComms] = useState<Community[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [newComm, setNewComm] = useState({ name: "", description: "", icon: "🚀" });

  const loadComms = async () => {
    const { data } = await supabase.from("communities").select("*").order("created_at");
    setComms((data ?? []) as Community[]);
    if (user) {
      const { data: m } = await supabase.from("community_members").select("community_id").eq("user_id", user.id);
      setMemberOf(new Set((m ?? []).map((r: { community_id: string }) => r.community_id)));
    }
  };

  useEffect(() => { loadComms(); }, [user]);

  const loadPosts = async (c: Community) => {
    setActive(c);
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(display_name)")
      .eq("community_id", c.id)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts: " + error.message);
    }
    setPosts((data ?? []) as unknown as Post[]);
  };

  const join = async (c: Community) => {
    if (!user) return;
    await supabase.from("community_members").insert({ community_id: c.id, user_id: user.id });
    toast.success(`Joined ${c.name}`);
    loadComms();
  };

  const createComm = async () => {
    if (!user || !newComm.name) return;
    const slug = newComm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data, error } = await supabase.from("communities").insert({
      name: newComm.name, slug, description: newComm.description, icon: newComm.icon, created_by: user.id,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("community_members").insert({ community_id: data.id, user_id: user.id });
    setNewComm({ name: "", description: "", icon: "🚀" });
    toast.success("Community created!");
    loadComms();
  };

  const post = async () => {
    if (!user || !active || !newPost) return;
    const { error } = await supabase.from("posts").insert({
      community_id: active.id, user_id: user.id, content: newPost,
    });
    if (error) return toast.error(error.message);
    await supabase.from("xp_events").insert({ user_id: user.id, amount: 20, reason: "Posted in community" });
    setNewPost("");
    toast.success("Posted! +20 XP");
    loadPosts(active);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="font-bold">Communities</h2>
        </div>
        <div className="mb-4 space-y-2">
          {comms.map((c) => (
            <div
              key={c.id}
              className={`cursor-pointer rounded-xl border p-3 transition-all ${active?.id === c.id ? "border-primary bg-primary/10" : "border-border/60 bg-card hover:border-border"}`}
              onClick={() => loadPosts(c)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.icon ?? "🌟"}</span>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                  </div>
                </div>
                {!memberOf.has(c.id) && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); join(c); }}>Join</Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Plus className="h-4 w-4" /> Create community</div>
          <Input placeholder="Name" value={newComm.name} onChange={(e) => setNewComm({ ...newComm, name: e.target.value })} className="mb-2" />
          <Input placeholder="Icon emoji" value={newComm.icon} onChange={(e) => setNewComm({ ...newComm, icon: e.target.value })} className="mb-2" />
          <Textarea placeholder="Description" rows={2} value={newComm.description} onChange={(e) => setNewComm({ ...newComm, description: e.target.value })} className="mb-2" />
          <Button size="sm" onClick={createComm} className="w-full">Create</Button>
        </div>
      </div>
      <div className="lg:col-span-2">
        {active ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">{active.icon ?? "🌟"}</span>
              <h2 className="text-xl font-bold">{active.name}</h2>
            </div>
            {memberOf.has(active.id) && (
              <div className="mb-4 rounded-xl border border-border/60 bg-secondary/30 p-3">
                <Textarea placeholder="Share something…" rows={2} value={newPost} onChange={(e) => setNewPost(e.target.value)} />
                <Button size="sm" className="mt-2" onClick={post}>Post (+20 XP)</Button>
              </div>
            )}
            <div className="space-y-3">
              {posts.map((p) => (
                <div key={p.id} className="rounded-xl border border-border/60 p-4">
                  <div className="text-sm font-medium">{p.profiles?.display_name ?? "User"}</div>
                  <div className="mt-1 whitespace-pre-wrap">{p.content}</div>
                </div>
              ))}
              {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet — be the first!</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
            Select a community to view posts.
          </div>
        )}
      </div>
    </div>
  );
}