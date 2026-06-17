
import React, { useState, useEffect } from "react";
import {
  Users, MessageSquare, BarChart3, Settings,
  ChevronRight, ChevronDown, TrendingUp, TrendingDown,
  Clock, Mic, Moon, Sun, CheckCircle, XCircle, AlertTriangle,
  ArrowLeft, Medal, Activity, Target, Search, Zap, Plus, Edit, Trash2,
  Award, Flame, Calendar, Phone, X, Hash, AtSign,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "../lib/api";

type Page = "login" | "students" | "student-detail" | "feedback-review" | "analytics" | "questions";
type ReviewStatus = "good" | "needs-review" | "wrong-analysis" | "unreviewed";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
  native_language: string;
  english_level: string;
  target_band: string;
  created_at: string;
  total_sessions?: number;
  average_score?: number | null;
  best_score?: number | null;
  last_active?: string | null;
}

interface PracticeSession {
  id: number;
  practice_mode: string;
  question: string;
  created_at: string;
}

interface AnalysisResult {
  id: number;
  session_id: number;
  telegram_user_id?: number | null;
  student_name?: string | null;
  practice_mode?: string | null;
  question?: string | null;
  transcript: string;
  score?: number | null;
  analysis_data: any;
  created_at: string;
}

interface SpeakingQuestion {
  id: number;
  part: number;
  question: string;
  is_active: boolean;
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function scoreColor(score: number | null | undefined): string {
  if (score == null) return "#94A3B8";
  if (score >= 80) return "#16A34A";
  if (score >= 70) return "#0D9488";
  if (score >= 60) return "#D97706";
  return "#DC2626";
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  const c = scoreColor(score);
  return (
    <span
      className="inline-flex items-center justify-center min-w-[34px] px-1.5 py-0.5 rounded-md text-xs font-bold tabular-nums"
      style={{ backgroundColor: c + "1A", color: c }}
    >
      {score == null ? "—" : score}
    </span>
  );
}

function partLabel(mode?: string | null): string {
  if (!mode) return "—";
  const d = String(mode).replace(/\D/g, "");
  return d ? `Part ${d}` : mode;
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86400000;
  if (diff < 3600000) return "Just now";
  if (diff < day) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ initials, size = "sm" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-12 h-12 text-sm" : size === "md" ? "w-9 h-9 text-xs" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-full flex-shrink-0 flex items-center justify-center font-bold`} style={{ backgroundColor: "#2563EB20", color: "#2563EB" }}>
      {initials}
    </div>
  );
}

function Sidebar({ page, setPage, onLogout }: {
  page: Page; setPage: (p: Page) => void; onLogout: () => void;
}) {
  const nav = [
    { id: "students" as Page, icon: <Users size={16} />, label: "Students" },
    { id: "feedback-review" as Page, icon: <MessageSquare size={16} />, label: "Feedback Review" },
    { id: "analytics" as Page, icon: <BarChart3 size={16} />, label: "Analytics" },
    { id: "questions" as Page, icon: <Zap size={16} />, label: "Questions" },
  ];
  const active = page === "student-detail" ? "students" : page;

  return (
    <div className="w-[240px] flex-shrink-0 flex flex-col h-full bg-card border-r border-border">
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2563EB" }}>
            <Mic size={15} className="text-white" />
          </div>
          <div>
            <div className="text-[14px] font-bold tracking-tight text-foreground leading-none">SpeakFlow</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 tracking-wide uppercase">Admin Console</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-2">Navigation</div>
        {nav.map(({ id, icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive ? "font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              style={isActive ? { backgroundColor: "#2563EB18", color: "#2563EB" } : {}}
            >
              {icon}
              {label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#2563EB" }} />}
            </button>
          );
        })}

        <div className="pt-3 mt-1 border-t border-border">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            Logout
          </button>
        </div>
      </nav>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      api.setToken(data.access_token);
      onLogin();
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
            <Mic size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">SpeakFlow</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Admin Login</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@speakflow.ai"
                className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 text-white font-semibold rounded-xl transition-all text-sm shadow-sm shadow-blue-500/20 mt-1"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, iconColor = "#2563EB" }: {
  icon: React.ReactNode; label: string; value: string | number; iconColor?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconColor + "18", color: iconColor }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function StudentsPage({ onSelect }: { onSelect: (s: TelegramUser) => void }) {
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, statsData] = await Promise.all([api.getUsers(), api.getStats()]);
        setUsers(usersData);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = users.filter(u => 
    u.first_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.last_name && u.last_name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-foreground">Students</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{users.length} enrolled</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students..."
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground w-56"
            />
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
            <StatCard icon={<Users size={16} />} label="Total Students" value={stats.total_users} iconColor="#2563EB" />
            <StatCard icon={<Activity size={16} />} label="Total Sessions" value={stats.total_sessions} iconColor="#0D9488" />
            <StatCard icon={<Target size={16} />} label="Total Analyses" value={stats.total_analyses} iconColor="#7C3AED" />
            <StatCard icon={<Mic size={16} />} label="Total Questions" value={stats.total_questions} iconColor="#D97706" />
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-sm font-semibold text-foreground">All Students</span>
            <span className="text-xs text-muted-foreground">{filtered.length} results</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Student", "Level", "Target", "Sessions", "Avg", "Best", "Last Active", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No students yet. They appear here after registering in the bot.
                    </td>
                  </tr>
                )}
                {filtered.map(student => {
                  const initials = `${student.first_name.charAt(0)}${student.last_name?.charAt(0) || ''}`;
                  return (
                    <tr
                      key={student.id}
                      onClick={() => onSelect(student)}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} />
                          <div>
                            <div className="text-sm font-semibold text-foreground">{student.first_name} {student.last_name || ''}</div>
                            <div className="text-[11px] text-muted-foreground">{student.username ? `@${student.username}` : student.native_language}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">{student.english_level}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">Band {student.target_band}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-foreground tabular-nums">{student.total_sessions ?? 0}</td>
                      <td className="px-4 py-3.5"><ScoreBadge score={student.average_score} /></td>
                      <td className="px-4 py-3.5"><ScoreBadge score={student.best_score} /></td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{timeAgo(student.last_active)}</td>
                      <td className="px-4 py-3.5">
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, color = "#2563EB" }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "18", color }}>
          {icon}
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function StudentDetailPage({ student, onBack }: { student: TelegramUser; onBack: () => void }) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getUserDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getUserDetail(student.id)
      .then(d => { if (alive) setDetail(d); })
      .catch(err => { console.error("Failed to fetch student detail", err); if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [student.id]);

  const initials = `${student.first_name.charAt(0)}${student.last_name?.charAt(0) || ''}`;
  const u = detail?.user ?? student;
  const stats = detail?.stats;
  const analysis = detail?.latest_analysis?.analysis_data;
  const chartData = (detail?.score_history ?? []).map((h, i) => ({
    label: `#${i + 1}`,
    score: h.score,
  }));

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Students
          </button>
        </div>

        {/* Profile header */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar initials={initials} size="lg" />
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-lg font-bold text-foreground">{u.first_name} {u.last_name || ''}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                {u.username && <span className="flex items-center gap-1"><AtSign size={12} />{u.username}</span>}
                {u.phone_number && <span className="flex items-center gap-1"><Phone size={12} />{u.phone_number}</span>}
                <span className="flex items-center gap-1"><Calendar size={12} />Joined {new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground capitalize">{u.english_level}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700">Target {u.target_band}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground">{u.native_language}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Loading student data…</p>
        ) : error ? (
          <p className="text-sm text-red-500 py-10 text-center">Failed to load student data.</p>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <MiniStat icon={<Activity size={14} />} label="Sessions" value={stats?.total_sessions ?? 0} color="#2563EB" />
              <MiniStat icon={<Target size={14} />} label="Avg Score" value={stats?.average_score ?? "—"} color="#0D9488" />
              <MiniStat icon={<Award size={14} />} label="Best" value={stats?.best_score ?? "—"} color="#7C3AED" />
              <MiniStat icon={<Flame size={14} />} label="Streak" value={`${stats?.streak ?? 0}d`} color="#D97706" />
            </div>

            {/* Score progress */}
            <div className="bg-card border border-border rounded-xl p-5 mb-5">
              <h2 className="text-sm font-bold text-foreground mb-4">Score Progress</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: "#2563EB" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No scored sessions yet.</p>
              )}
            </div>

            {/* Sessions table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
              <div className="px-5 py-3.5 border-b border-border">
                <h2 className="text-sm font-bold text-foreground">Practice History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Part", "Question", "Score", "Date"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detail?.sessions ?? []).length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">No sessions yet.</td></tr>
                    )}
                    {(detail?.sessions ?? []).map(s => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3"><span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded">{partLabel(s.practice_mode)}</span></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[360px]">{s.question || "—"}</td>
                        <td className="px-4 py-3"><ScoreBadge score={s.score} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Latest feedback */}
            {analysis && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-foreground">Latest Feedback</h2>
                  <ScoreBadge score={analysis.overall_score} />
                </div>
                {analysis.summary && <p className="text-sm text-muted-foreground mb-4">{analysis.summary}</p>}
                {analysis.skill_scores && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {Object.entries(analysis.skill_scores).map(([k, v]) => (
                      <div key={k} className="bg-muted/40 rounded-lg p-2.5">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</div>
                        <div className="text-base font-bold text-foreground tabular-nums">{v as number}</div>
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(analysis.mistakes) && analysis.mistakes.length > 0 && (
                  <div className="mb-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Mistakes</h3>
                    <div className="space-y-1.5">
                      {analysis.mistakes.slice(0, 5).map((m: any, i: number) => (
                        <div key={i} className="text-xs flex flex-wrap items-center gap-1.5">
                          <span className="line-through text-red-500">{m.wrong}</span>
                          <ChevronRight size={11} className="text-muted-foreground" />
                          <span className="text-green-600 font-medium">{m.correct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FeedbackModal({ result, onClose }: { result: AnalysisResult; onClose: () => void }) {
  const a = result.analysis_data || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">{result.student_name || "Unknown student"}</h2>
            <p className="text-xs text-muted-foreground">{partLabel(result.practice_mode)} · {new Date(result.created_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={result.score ?? a.overall_score} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {result.question && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Question</h3>
              <p className="text-sm text-foreground">{result.question}</p>
            </div>
          )}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Transcript</h3>
            <p className="text-sm text-muted-foreground italic">"{result.transcript}"</p>
          </div>
          {a.summary && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Summary</h3>
              <p className="text-sm text-foreground">{a.summary}</p>
            </div>
          )}
          {a.skill_scores && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(a.skill_scores).map(([k, v]) => (
                <div key={k} className="bg-muted/40 rounded-lg p-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</div>
                  <div className="text-base font-bold text-foreground tabular-nums">{v as number}</div>
                </div>
              ))}
            </div>
          )}
          {Array.isArray(a.mistakes) && a.mistakes.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Mistakes</h3>
              <div className="space-y-1.5">
                {a.mistakes.map((m: any, i: number) => (
                  <div key={i} className="text-xs flex flex-wrap items-center gap-1.5">
                    <span className="line-through text-red-500">{m.wrong}</span>
                    <ChevronRight size={11} className="text-muted-foreground" />
                    <span className="text-green-600 font-medium">{m.correct}</span>
                    {m.explanation && <span className="text-muted-foreground">— {m.explanation}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {a.improved_answer && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Improved Answer</h3>
              <p className="text-sm text-foreground">{a.improved_answer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackReviewPage() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    api.getResults()
      .then(setResults)
      .catch(err => console.error("Failed to fetch data", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = results.filter(r =>
    (r.student_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.transcript || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Feedback Review</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{results.length} analyses</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student or transcript..."
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground w-64"
            />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Student", "Part", "Transcript", "Score", "Date", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">No feedback yet.</td></tr>
                )}
                {filtered.map(result => (
                  <tr key={result.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(result)}>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{result.student_name || "Unknown"}</td>
                    <td className="px-4 py-3.5"><span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded">{partLabel(result.practice_mode)}</span></td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground truncate max-w-[260px]">{result.transcript}</td>
                    <td className="px-4 py-3.5"><ScoreBadge score={result.score ?? result.analysis_data?.overall_score} /></td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{new Date(result.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      <button className="text-xs text-[#2563EB] font-semibold hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selected && <FeedbackModal result={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const PART_COLORS = ["#2563EB", "#0D9488", "#7C3AED", "#94A3B8"];

function AnalyticsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(err => console.error("Failed to fetch analytics", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const k = data?.kpis;
  const spd = (data?.sessions_per_day ?? []).map(d => ({
    day: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: d.count,
  }));

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <h1 className="text-xl font-bold text-foreground mb-6">Analytics</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
          <StatCard icon={<Users size={16} />} label="Students" value={k?.total_users ?? 0} iconColor="#2563EB" />
          <StatCard icon={<Activity size={16} />} label="Sessions" value={k?.total_sessions ?? 0} iconColor="#0D9488" />
          <StatCard icon={<MessageSquare size={16} />} label="Analyses" value={k?.total_analyses ?? 0} iconColor="#7C3AED" />
          <StatCard icon={<Target size={16} />} label="Avg Score" value={k?.average_score ?? "—"} iconColor="#16A34A" />
          <StatCard icon={<Flame size={16} />} label="Active (7d)" value={k?.active_users_7d ?? 0} iconColor="#D97706" />
          <StatCard icon={<Zap size={16} />} label="Questions" value={k?.active_questions ?? 0} iconColor="#DB2777" />
        </div>

        {/* Sessions per day */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Sessions — last 14 days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spd} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Score distribution */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">Score Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.score_distribution ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Part distribution */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">Practice by Part</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={(data?.part_distribution ?? []).filter(p => p.value > 0)}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label
                >
                  {(data?.part_distribution ?? []).map((_, i) => (
                    <Cell key={i} fill={PART_COLORS[i % PART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionsPage() {
  const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPart, setNewPart] = useState(1);
  const [newQuestion, setNewQuestion] = useState("");
  const [editing, setEditing] = useState<SpeakingQuestion | null>(null);
  const [editPart, setEditPart] = useState(1);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [filterPart, setFilterPart] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getQuestions();
        setQuestions(data);
      } catch (err) {
        console.error("Failed to fetch questions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!newQuestion.trim()) return;
    try {
      const created = await api.createQuestion({ part: newPart, question: newQuestion.trim() });
      setQuestions([...questions, created]);
      setNewQuestion("");
      setShowAdd(false);
    } catch (err) {
      console.error("Failed to create question", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
    } catch (err) {
      console.error("Failed to delete question", err);
    }
  };

  const handleToggleActive = async (q: SpeakingQuestion) => {
    try {
      const updated = await api.updateQuestion(q.id, { is_active: !q.is_active });
      setQuestions(questions.map(x => x.id === q.id ? updated : x));
    } catch (err) {
      console.error("Failed to toggle question", err);
    }
  };

  const counts = {
    all: questions.length,
    1: questions.filter(q => q.part === 1).length,
    2: questions.filter(q => q.part === 2).length,
    3: questions.filter(q => q.part === 3).length,
  };
  const filtered = filterPart ? questions.filter(q => q.part === filterPart) : questions;

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      const updated = await api.updateQuestion(editing.id, { part: editPart, question: editQuestionText });
      setQuestions(questions.map(q => q.id === editing.id ? updated : q));
      setEditing(null);
    } catch (err) {
      console.error("Failed to update question", err);
    }
  };

  const startEdit = (question: SpeakingQuestion) => {
    setEditing(question);
    setEditPart(question.part);
    setEditQuestionText(question.question);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">Speaking Questions</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all"
          >
            <Plus size={16} />
            Add Question
          </button>
        </div>

        {showAdd && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">New Question</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Part</label>
                <select
                  value={newPart}
                  onChange={(e) => setNewPart(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                >
                  <option value={1}>Part 1</option>
                  <option value={2}>Part 2</option>
                  <option value={3}>Part 3</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Question</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
                Save
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-muted hover:bg-muted/70 text-muted-foreground rounded-lg text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Part filter tabs */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { id: null as number | null, label: `All (${counts.all})` },
            { id: 1, label: `Part 1 (${counts[1]})` },
            { id: 2, label: `Part 2 (${counts[2]})` },
            { id: 3, label: `Part 3 (${counts[3]})` },
          ].map(t => (
            <button
              key={String(t.id)}
              onClick={() => setFilterPart(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterPart === t.id ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Part", "Question", "Active", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">No questions. Add one above.</td></tr>
                )}
                {filtered.map(question => {
                  const isEditing = editing?.id === question.id;
                  return (
                    <tr key={question.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <select
                            value={editPart}
                            onChange={(e) => setEditPart(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-muted border border-border rounded text-sm"
                          >
                            <option value={1}>Part 1</option>
                            <option value={2}>Part 2</option>
                            <option value={3}>Part 3</option>
                          </select>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">Part {question.part}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isEditing ? (
                          <input
                            type="text" value={editQuestionText} onChange={e => setEditQuestionText(e.target.value)}
                            className="w-full px-2 py-1 bg-muted border border-border rounded text-sm"
                          />
                        ) : (
                          <span className="text-sm">{question.question}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleActive(question)}
                          title="Toggle visibility in bot"
                          className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${question.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          {question.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button onClick={handleUpdate} className="text-xs text-green-600 font-semibold hover:underline">Save</button>
                            <button onClick={() => setEditing(null)} className="text-xs text-gray-600 font-semibold hover:underline">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEdit(question)} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                              <Edit size={12} /> Edit
                            </button>
                            <button onClick={() => handleDelete(question.id)} className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("login");
  const [selectedStudent, setSelectedStudent] = useState<TelegramUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
      setPage("students");
    }
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setIsAuthenticated(false);
    setPage("login");
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => { setIsAuthenticated(true); setPage("students"); }} />;
  }

  return (
    <div className="font-['Inter'] antialiased flex h-screen bg-background">
      <Sidebar
        page={page}
        setPage={setPage}
        onLogout={handleLogout}
      />
      {page === "students" && <StudentsPage onSelect={s => { setSelectedStudent(s); setPage("student-detail"); }} />}
      {page === "student-detail" && selectedStudent && <StudentDetailPage student={selectedStudent} onBack={() => setPage("students")} />}
      {page === "feedback-review" && <FeedbackReviewPage />}
      {page === "analytics" && <AnalyticsPage />}
      {page === "questions" && <QuestionsPage />}
    </div>
  );
}

export default App;
