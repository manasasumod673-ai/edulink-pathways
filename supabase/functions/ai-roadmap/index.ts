// verify_jwt disabled in config.toml; we manually verify the user inside the function.
// AI provider: Groq (llama-3.3-70b) — free tier, 14,400 req/day, 30 RPM.
// Set GROQ_API_KEY in Supabase Dashboard → Edge Functions → Secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse request body ───────────────────────────────────────────────────
    const { goal } = await req.json();
    if (!goal || typeof goal !== "string") {
      return new Response(JSON.stringify({ error: "Goal required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch user skills for personalisation ────────────────────────────────
    const { data: skillRows } = await supabase
      .from("profile_skills")
      .select("skills(name)")
      .eq("user_id", user.id);
    const skills = (skillRows ?? [])
      .map((r: { skills: { name: string } | null }) => r.skills?.name)
      .filter(Boolean);

    // ── Groq API key check ───────────────────────────────────────────────────
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      console.error("GROQ_API_KEY secret is not set.");
      return new Response(
        JSON.stringify({ error: "AI not configured — set GROQ_API_KEY in Supabase Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Build prompt ─────────────────────────────────────────────────────────
    const systemPrompt = `You are an expert learning coach. When given a goal, you create practical, actionable step-by-step learning roadmaps. Always respond with valid JSON only — no markdown, no code fences, no extra text.`;

    const userPrompt = `Goal: ${goal}
Current skills: ${skills.join(", ") || "none"}

Return a JSON object in exactly this format:
{
  "steps": [
    {
      "title": "Step title here",
      "description": "Detailed description of what to learn and why",
      "resources": ["Resource or course name 1", "Resource or course name 2"]
    }
  ]
}

Include 6-10 actionable steps. Each step must have title, description, and a resources array.`;

    // ── Call Groq API (OpenAI-compatible) ────────────────────────────────────
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    const aiBody = await aiRes.text();
    console.log(`Groq response status: ${aiRes.status}`);

    if (!aiRes.ok) {
      console.error("Groq API error:", aiRes.status, aiBody);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `AI request failed (${aiRes.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Parse Groq response ──────────────────────────────────────────────────
    const aiData = JSON.parse(aiBody);
    const rawText = aiData?.choices?.[0]?.message?.content ?? "{}";
    console.log("Groq raw response:", rawText.slice(0, 300));

    let args: { steps: Array<{ title: string; description: string; resources?: string[] }> };
    try {
      args = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Failed to parse Groq JSON output:", rawText, parseErr);
      return new Response(
        JSON.stringify({ error: "AI returned invalid response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!args.steps || !Array.isArray(args.steps)) {
      console.error("Unexpected structure:", args);
      return new Response(
        JSON.stringify({ error: "AI returned unexpected structure. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Save to database ─────────────────────────────────────────────────────
    const { error: insErr } = await supabase
      .from("roadmaps")
      .insert({ user_id: user.id, goal, content: args });

    if (insErr) {
      console.error("DB insert error:", insErr);
      return new Response(
        JSON.stringify({ error: insErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase
      .from("xp_events")
      .insert({ user_id: user.id, amount: 50, reason: "Generated AI roadmap" });

    return new Response(
      JSON.stringify({ success: true, roadmap: args }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("Unhandled roadmap error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});