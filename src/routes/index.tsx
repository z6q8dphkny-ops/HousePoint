import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/cic-logo.png.asset.json";

type Banner = { type: "red" | "white" | "tie"; title: string; text: string } | null;

type AppState = {
  red_score: number;
  white_score: number;
  announcement: string;
  active_banner: Banner;
};

type HistoryRow = {
  id: string;
  house: "Red" | "White";
  delta: number;
  reason: string;
  created_at: string;
};

const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a165ff57-6fbc-4e34-82e7-0881228cdc38/id-preview-0fc14a71--fa1c02d6-f930-4dd2-8410-8bb0bacbd5b2.lovable.app-1783127781534.png";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "CIC House Point Standings — Live Leaderboard" },
      {
        name: "description",
        content:
          "Track live points and history for the CIC House competition between the Red and White houses.",
      },
      { property: "og:title", content: "CIC House Point Standings" },
      {
        property: "og:description",
        content:
          "Stay updated with the live House Point leaderboard for the CIC Red vs White house competition.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://housepoint.lovable.app/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "CIC House Point Standings" },
      {
        name: "twitter:description",
        content:
          "Stay updated with the live House Point leaderboard for the CIC Red vs White house competition.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://housepoint.lovable.app/" },
      { rel: "preload", as: "image", href: logoAsset.url, fetchpriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "CIC House Point Standings",
          url: "https://housepoint.lovable.app/",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "CIC",
          url: "https://housepoint.lovable.app/",
          logo: "https://housepoint.lovable.app/favicon.ico",
        }),
      },
    ],
  }),
});

function triggerSideConfetti() {
  if (typeof window === "undefined") return;
  confetti({ particleCount: 300, angle: 60, spread: 165, origin: { x: 0, y: 0.65 }, zIndex: 9999 });
  confetti({ particleCount: 300, angle: 120, spread: 165, origin: { x: 1, y: 0.65 }, zIndex: 9999 });
}

function Dashboard() {
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, setState] = useState<AppState>({
    red_score: 0,
    white_score: 0,
    announcement: "",
    active_banner: null,
  });
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showLogin, setShowLogin] = useState(false);

  // Admin form
  const [house, setHouse] = useState<"Red" | "White">("Red");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [customBanner, setCustomBanner] = useState("");

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s ? { userId: s.user.id } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ? { userId: s.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  // Load + realtime
  useEffect(() => {
    const loadState = () =>
      supabase
        .from("app_state")
        .select("red_score, white_score, announcement, active_banner")
        .eq("id", true)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setState(data as AppState);
            setAnnouncementDraft(data.announcement ?? "");
          }
        });
    const loadHistory = () =>
      supabase
        .from("history_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data }) => setHistory((data ?? []) as HistoryRow[]));

    loadState();
    loadHistory();

    const channel = supabase
      .channel("hp-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, loadState)
      .on("postgres_changes", { event: "*", schema: "public", table: "history_entries" }, loadHistory)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (state.active_banner) triggerSideConfetti();
  }, [state.active_banner]);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const addPoints = async () => {
    const delta = parseInt(points, 10);
    if (isNaN(delta)) return alert("Please input a valid numeric value for the Point Delta.");
    if (!reason.trim()) return alert("Please provide an event description or justification reason.");

    const nextRed = house === "Red" ? state.red_score + delta : state.red_score;
    const nextWhite = house === "White" ? state.white_score + delta : state.white_score;

    const { error: e1 } = await supabase
      .from("app_state")
      .update({ red_score: nextRed, white_score: nextWhite, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (e1) return alert(e1.message);

    const { error: e2 } = await supabase.from("history_entries").insert({
      house,
      delta,
      reason: reason.trim(),
    });
    if (e2) return alert(e2.message);

    setPoints("");
    setReason("");
  };

  const updateAnnouncement = async () => {
    const { error } = await supabase
      .from("app_state")
      .update({ announcement: announcementDraft, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) return alert(error.message);
    alert("Live Announcement Billboard updated successfully!");
  };

  const declareWinnerBanner = async () => {
    const r = state.red_score;
    const w = state.white_score;
    if (r === 0 && w === 0) return alert("Scores are at 0. Cannot declare a winner.");
    const custom = customBanner.trim();
    let banner: Banner;
    if (r > w) banner = { type: "red", title: "🔴 RED HOUSE VICTORIOUS!", text: custom || `Red House claims the crown with ${r} points!` };
    else if (w > r) banner = { type: "white", title: "⚪ WHITE HOUSE VICTORIOUS!", text: custom || `White House claims the crown with ${w} points!` };
    else banner = { type: "tie", title: "⚖️ THE SEASON ENDS IN A DRAW!", text: custom || `Both houses finished with ${r} points!` };

    const { error } = await supabase
      .from("app_state")
      .update({ active_banner: banner, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) return alert(error.message);
  };

  const dismissBanner = async () => {
    await supabase.from("app_state").update({ active_banner: null }).eq("id", true);
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to permanently delete the entire history log? This action cannot be undone.")) return;
    const { error } = await supabase.from("history_entries").delete().gt("delta", -2147483648);
    if (error) return alert(error.message);
  };

  const deleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this specific log entry?")) return;
    await supabase.from("history_entries").delete().eq("id", id);
  };

  const leader =
    state.red_score > state.white_score
      ? "Red House 👑"
      : state.white_score > state.red_score
        ? "White House 👑"
        : "Tie ⚖️";

  return (
    <>
      <header>
        <div className="header-container">
          <div className="brand-wrapper">
            <img
              src={logoAsset.url}
              alt="CIC Logo"
              className="header-logo"
              width={512}
              height={512}
              fetchPriority="high"
              decoding="async"
            />

            <h1>HOUSE POINT STANDINGS</h1>
          </div>
          <div className="auth-container">
            {!session ? (
              <div className="header-login">
                <button onClick={() => setShowLogin(true)} className="btn-login-header">
                  Council Login
                </button>
              </div>
            ) : (
              <div className="header-logout">
                <span className="user-status">Council Active</span>
                <button onClick={logout} className="btn-logout-header">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}


      {state.active_banner && (
        <div className={`winner-banner banner-${state.active_banner.type}`}>
          <div className="banner-body-content">
            <span className="banner-icon-trophy">🏆</span>
            <div className="banner-text-details">
              <strong>{state.active_banner.title}</strong>
              <p>{state.active_banner.text}</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={dismissBanner} className="banner-close-btn" title="Dismiss Banner">
              ×
            </button>
          )}
        </div>
      )}

      <div className="container">
        <div className="scores">
          <div className="card red">
            <h2>Red House</h2>
            <div>{state.red_score}</div>
          </div>
          <div className="card white">
            <h2>White House</h2>
            <div>{state.white_score}</div>
          </div>
        </div>

        <div className="panel">
          <div id="leader">Leader: {leader}</div>
        </div>

        <div className="panel">
          <h2 style={{ textAlign: "center" }}>Announcement</h2>
          <textarea value={state.announcement} placeholder="No announcements yet..." readOnly />
        </div>

        {isAdmin && (
          <div className="panel">
            <h2>Score Management</h2>
            <div className="admin-grid">
              <div>
                <label>Target House</label>
                <select value={house} onChange={(e) => setHouse(e.target.value as "Red" | "White")}>
                  <option value="Red">Red House</option>
                  <option value="White">White House</option>
                </select>
              </div>
              <div>
                <label>Score Adjustment</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Enter points (e.g., 50 or -20)"
                />
              </div>
            </div>
            <label>Validation Reason/Event Description</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Won the House Football Tournament Match"
            />
            <button onClick={addPoints} className="btn-primary">
              Post Point Adjustment
            </button>

            <hr className="admin-divider" />

            <h2>Announcements &amp; Banner Management</h2>
            <div style={{ marginBottom: 20 }}>
              <label>Update Live Announcement Billboard</label>
              <textarea
                value={announcementDraft}
                onChange={(e) => setAnnouncementDraft(e.target.value)}
                placeholder="Enter dashboard announcement text..."
              />
              <button
                onClick={updateAnnouncement}
                className="btn-secondary"
                style={{ marginTop: -10, marginBottom: 15 }}
              >
                Publish New Announcement
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Customize Winner Banner Subtext (Optional)</label>
              <input
                value={customBanner}
                onChange={(e) => setCustomBanner(e.target.value)}
                placeholder="e.g., Congratulations to the champions! 🎉"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                <button onClick={declareWinnerBanner} className="btn-primary">
                  Broadcast Winner Banner
                </button>
                <button
                  onClick={dismissBanner}
                  className="btn-secondary"
                  style={{ borderColor: "#71717a", color: "#71717a" }}
                >
                  Dismiss Active Banner
                </button>
              </div>
            </div>

            <hr className="admin-divider" />

            <h2>Data Management</h2>
            <button
              onClick={clearHistory}
              className="btn-secondary"
              style={{ borderColor: "#dc2626", color: "#dc2626" }}
            >
              Clear All History Logs
            </button>
          </div>
        )}

        <div className="panel">
          <h2>History Log</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date Added</th>
                  <th>House Entity</th>
                  <th>Points Shift</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.created_at).toLocaleString()}</td>
                    <td>{h.house}</td>
                    <td>{h.delta}</td>
                    <td>{h.reason}</td>
                    <td>
                      {isAdmin ? (
                        <button
                          onClick={() => deleteLog(h.id)}
                          className="btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                        >
                          Delete
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#71717a" }}>
                      No log entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return alert(error.message);
    onClose();
  };

  return (
    <div
      style={{
        display: "flex",
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(5px)",
        zIndex: 99999,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 24,
          padding: "40px 32px",
          textAlign: "center",
          boxShadow: "0 15px 35px rgba(220,38,38,0.1)",
        }}
      >
        <h3
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#dc2626",
            marginBottom: 32,
            letterSpacing: "-0.5px",
          }}
        >
          Council Login
        </h3>
        <div style={{ marginBottom: 20, textAlign: "left" }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 24, textAlign: "left" }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button
          onClick={submit}
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
            boxShadow: "0 4px 12px rgba(220,38,38,0.2)",
          }}
        >
          {busy ? "Signing in..." : "Login"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#71717a",
            fontSize: "0.9rem",
            marginTop: 16,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Scoreboard
        </button>

      </div>
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
