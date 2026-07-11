import { createFileRoute } from "@tanstack/react-router";

// Auto-declares the House Point winner. Called by pg_cron on Dec 31 at 23:59.
export const Route = createFileRoute("/api/public/hooks/declare-winner")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data: state, error: readErr } = await supabaseAdmin
          .from("app_state")
          .select("red_score, white_score")
          .eq("id", true)
          .maybeSingle();

        if (readErr || !state) {
          return new Response(
            JSON.stringify({ error: readErr?.message ?? "No app_state" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const r = state.red_score;
        const w = state.white_score;
        let banner:
          | { type: "red" | "white" | "tie"; title: string; text: string };
        if (r > w) {
          banner = {
            type: "red",
            title: "🔴 RED HOUSE VICTORIOUS!",
            text: `Red House claims the crown with ${r} points!`,
          };
        } else if (w > r) {
          banner = {
            type: "white",
            title: "⚪ WHITE HOUSE VICTORIOUS!",
            text: `White House claims the crown with ${w} points!`,
          };
        } else {
          banner = {
            type: "tie",
            title: "⚖️ THE SEASON ENDS IN A DRAW!",
            text: `Both houses finished with ${r} points!`,
          };
        }

        const { error: updErr } = await supabaseAdmin
          .from("app_state")
          .update({
            active_banner: banner,
            updated_at: new Date().toISOString(),
          })
          .eq("id", true);

        if (updErr) {
          return new Response(JSON.stringify({ error: updErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, banner }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
} as never);
