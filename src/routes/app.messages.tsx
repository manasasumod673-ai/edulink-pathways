import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({ component: Messages });

type Conv = { id: string; user_a: string; user_b: string; last_message_at: string; other?: { display_name: string } };
type Msg = { id: string; sender_id: string; content: string; created_at: string };

function Messages() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [newUser, setNewUser] = useState("");

  const loadConvs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    const list = (data ?? []) as Conv[];
    // fetch other names
    const others = list.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
    if (others.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", others);
      const map = new Map((profs ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]));
      setConvs(list.map((c) => ({ ...c, other: { display_name: map.get(c.user_a === user.id ? c.user_b : c.user_a) ?? "User" } })));
    } else setConvs(list);
  };

  useEffect(() => { loadConvs(); }, [user]);

  const loadMsgs = async (c: Conv) => {
    setActive(c);
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", c.id).order("created_at");
    setMsgs((data ?? []) as Msg[]);
  };

  const send = async () => {
    if (!active || !user || !text.trim()) return;
    const { error } = await supabase.from("messages").insert({ conversation_id: active.id, sender_id: user.id, content: text });
    if (error) return toast.error(error.message);
    setText("");
    loadMsgs(active);
  };

  const startConv = async () => {
    if (!user || !newUser.trim()) return;
    // find user by display_name
    const { data: prof } = await supabase.from("profiles").select("id").ilike("display_name", newUser).limit(1).maybeSingle();
    if (!prof) return toast.error("User not found");
    const otherId = (prof as { id: string }).id;
    if (otherId === user.id) return toast.error("Can't message yourself");
    const [a, b] = [user.id, otherId].sort();
    // try existing
    const { data: existing } = await supabase.from("conversations").select("*").eq("user_a", a).eq("user_b", b).maybeSingle();
    let conv = existing as Conv | null;
    if (!conv) {
      const { data: created, error } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select().single();
      if (error) return toast.error(error.message);
      conv = created as Conv;
    }
    setNewUser("");
    await loadConvs();
    if (conv) loadMsgs(conv);
  };

  return (
    <div className="grid h-[70vh] gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-border/60 bg-card p-4 lg:col-span-1">
        <div className="mb-3 flex items-center gap-2"><MessageSquare className="h-5 w-5" /><h2 className="font-bold">Chats</h2></div>
        <div className="mb-3 flex gap-1">
          <Input placeholder="User display name" value={newUser} onChange={(e) => setNewUser(e.target.value)} />
          <Button size="sm" onClick={startConv}>Start</Button>
        </div>
        <div className="space-y-1">
          {convs.map((c) => (
            <div
              key={c.id}
              className={`cursor-pointer rounded-lg p-2 ${active?.id === c.id ? "bg-primary/15" : "hover:bg-secondary"}`}
              onClick={() => loadMsgs(c)}
            >
              {c.other?.display_name ?? "User"}
            </div>
          ))}
          {convs.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
        </div>
      </div>
      <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-4 lg:col-span-2">
        {active ? (
          <>
            <div className="mb-3 border-b border-border/60 pb-2 font-bold">{active.other?.display_name}</div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" />
              <Button onClick={send}><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="m-auto text-muted-foreground">Select or start a conversation.</div>
        )}
      </div>
    </div>
  );
}