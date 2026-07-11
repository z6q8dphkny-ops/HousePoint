import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Council Login — CIC House Point Standings" },
      {
        name: "description",
        content: "Sign in to your CIC Student Council account to manage House Point standings.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Council Login — CIC House Point Standings" },
      {
        property: "og:description",
        content: "Sign in to your CIC Student Council account to manage House Point standings.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://housepoint.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://housepoint.lovable.app/auth" }],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setMsg(error.message);
    navigate({ to: "/" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#e8d3d3",
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 24,
          padding: "40px 32px",
          boxShadow: "0 15px 35px rgba(220,38,38,0.1)",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#dc2626",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Council Login
        </h1>
        <p style={{ color: "#71717a", fontSize: "0.9rem", textAlign: "center", marginBottom: 28 }}>
          Sign in to manage scores, announcements, and the winner banner.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        {msg && (
          <div
            style={{
              marginBottom: 16,
              padding: 10,
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 8,
              fontSize: "0.85rem",
            }}
          >
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            background: "#dc2626",
            color: "#fff",
            padding: 14,
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          {busy ? "Please wait..." : "Sign In"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/" style={{ color: "#71717a", fontSize: "0.85rem" }}>
            ← Back to Scoreboard
          </Link>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "#52525b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  background: "#fff",
  border: "2px solid #e5e5e5",
  borderRadius: 8,
  color: "#262626",
  padding: "0 14px",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
};
