// verify_jwt disabled in config.toml; we manually verify the user inside the function.
// AI provider: Google Gemini via OpenAI-compatible endpoint.
// Set GEMINI_API_KEY in Supabase Dashboard → Edge Functions → Secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { goal } = await req.json();
    if (!goal || typeof goal !== "string") return new Response(JSON.stringify({ error: "Goal required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch user's existing skills for personalization
    const { data: skillRows } = await supabase
      .from("profile_skills")
      .select("skills(name)")
      .eq("user_id", user.id);
    const skills = (skillRows ?? []).map((r: { skills: { name: string } | null }) => r.skills?.name).filter(Boolean);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured — set GEMINI_API_KEY in Supabase Edge Function secrets." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        messages: [
          { role: "system", content: "You are a learning coach. Build practical step-by-step roadmaps." },
          { role: "user", content: `Goal: ${goal}\nCurrent skills: ${skills.join(", ") || "none"}\nReturn a roadmap of 6-10 actionable steps.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_roadmap",
            description: "Save a learning roadmap",
            parameters: {
              type: "object",
              properties: {
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      resources: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "description"],
                  },
                },
              },
              required: ["steps"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_roadmap" } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { steps: [] };

    const { error: insErr } = await supabase.from("roadmaps").insert({ user_id: user.id, goal, content: args });
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabase.from("xp_events").insert({ user_id: user.id, amount: 50, reason: "Generated AI roadmap" });

    return new Response(JSON.stringify({ success: true, roadmap: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("roadmap error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});