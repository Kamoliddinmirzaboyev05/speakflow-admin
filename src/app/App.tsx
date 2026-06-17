
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

// ── Skeleton loaders ──────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

/** Page heading placeholder + optional action button placeholder. */
function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-7">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      {action && <Skeleton className="h-9 w-36 rounded-lg" />}
    </div>
  );
}

function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-3.5 ${c === 0 ? "w-40" : "w-16"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  );
}

/** Centered wrapper matching each page's content padding. */
function PageSkeletonShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">{children}</div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, confirmLabel = "O'chirish", onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100 text-red-600">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-muted hover:bg-muted/70 text-muted-foreground rounded-lg text-sm font-semibold transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
  if (!iso) return "Hech qachon";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86400000;
  if (diff < 3600000) return "Hozirgina";
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
    { id: "students" as Page, icon: <Users size={16} />, label: "O'quvchilar" },
    { id: "feedback-review" as Page, icon: <MessageSquare size={16} />, label: "Tahlillar ko'rigi" },
    { id: "analytics" as Page, icon: <BarChart3 size={16} />, label: "Analitika" },
    { id: "questions" as Page, icon: <Zap size={16} />, label: "Savollar" },
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
            <div className="text-[10px] text-muted-foreground mt-0.5 tracking-wide uppercase">Admin panel</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-2">Bo'limlar</div>
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
            Chiqish
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
      setError("Email yoki parol noto'g'ri");
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
          <p className="text-sm text-muted-foreground mt-1 font-medium">Admin kirish</p>
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
              <label className="block text-sm font-semibold text-foreground mb-1.5">Parol</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolingizni kiriting"
                className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 text-white font-semibold rounded-xl transition-all text-sm shadow-sm shadow-blue-500/20 mt-1"
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
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
    return (
      <PageSkeletonShell>
        <PageHeaderSkeleton />
        <StatCardsSkeleton count={4} />
        <TableSkeleton rows={6} cols={5} />
      </PageSkeletonShell>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-foreground">O'quvchilar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{users.length} ro'yxatdan o'tgan</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="O'quvchilarni qidirish..."
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground w-56"
            />
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
            <StatCard icon={<Users size={16} />} label="Jami o'quvchilar" value={stats.total_users} iconColor="#2563EB" />
            <StatCard icon={<Activity size={16} />} label="Jami mashg'ulotlar" value={stats.total_sessions} iconColor="#0D9488" />
            <StatCard icon={<Target size={16} />} label="Jami tahlillar" value={stats.total_analyses} iconColor="#7C3AED" />
            <StatCard icon={<Mic size={16} />} label="Jami savollar" value={stats.total_questions} iconColor="#D97706" />
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Barcha o'quvchilar</span>
            <span className="text-xs text-muted-foreground">{filtered.length} natija</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["O'quvchi", "Daraja", "Maqsad", "Mashg'ulotlar", "O'rtacha", "Eng yaxshi", "Oxirgi faollik", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      Hozircha o'quvchi yo'q. Ular botda ro'yxatdan o'tgach shu yerda paydo bo'ladi.
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
            <ArrowLeft size={14} /> O'quvchilar
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
                <span className="flex items-center gap-1"><Calendar size={12} />Qo'shilgan {new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground capitalize">{u.english_level}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700">Maqsad {u.target_band}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground">{u.native_language}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
            <ChartCardSkeleton className="mb-5" />
            <TableSkeleton rows={4} cols={3} />
          </>
        ) : error ? (
          <p className="text-sm text-red-500 py-10 text-center">Ma'lumotni yuklab bo'lmadi.</p>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <MiniStat icon={<Activity size={14} />} label="Mashg'ulotlar" value={stats?.total_sessions ?? 0} color="#2563EB" />
              <MiniStat icon={<Target size={14} />} label="O'rtacha ball" value={stats?.average_score ?? "—"} color="#0D9488" />
              <MiniStat icon={<Award size={14} />} label="Eng yaxshi" value={stats?.best_score ?? "—"} color="#7C3AED" />
              <MiniStat icon={<Flame size={14} />} label="Ketma-ketlik" value={`${stats?.streak ?? 0}d`} color="#D97706" />
            </div>

            {/* Score progress */}
            <div className="bg-card border border-border rounded-xl p-5 mb-5">
              <h2 className="text-sm font-bold text-foreground mb-4">Ball dinamikasi</h2>
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
                <p className="text-sm text-muted-foreground py-8 text-center">Hozircha baholangan mashg'ulot yo'q.</p>
              )}
            </div>

            {/* Sessions table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
              <div className="px-5 py-3.5 border-b border-border">
                <h2 className="text-sm font-bold text-foreground">Mashq tarixi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Qism", "Savol", "Ball", "Sana"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detail?.sessions ?? []).length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">Hozircha mashg'ulot yo'q.</td></tr>
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
                  <h2 className="text-sm font-bold text-foreground">Oxirgi tahlil</h2>
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
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Xatolar</h3>
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
            <h2 className="text-base font-bold text-foreground">{result.student_name || "Noma'lum o'quvchi"}</h2>
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
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Savol</h3>
              <p className="text-sm text-foreground">{result.question}</p>
            </div>
          )}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Matn</h3>
            <p className="text-sm text-muted-foreground italic">"{result.transcript}"</p>
          </div>
          {a.summary && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Xulosa</h3>
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
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Xatolar</h3>
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
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Yaxshilangan javob</h3>
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
    return (
      <PageSkeletonShell>
        <PageHeaderSkeleton />
        <TableSkeleton rows={7} cols={4} />
      </PageSkeletonShell>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Tahlillar ko'rigi</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{results.length} tahlil</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="O'quvchi yoki matnni qidirish..."
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground w-64"
            />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["O'quvchi", "Qism", "Matn", "Ball", "Sana", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Hozircha tahlil yo'q.</td></tr>
                )}
                {filtered.map(result => (
                  <tr key={result.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(result)}>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{result.student_name || "Noma'lum"}</td>
                    <td className="px-4 py-3.5"><span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded">{partLabel(result.practice_mode)}</span></td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground truncate max-w-[260px]">{result.transcript}</td>
                    <td className="px-4 py-3.5"><ScoreBadge score={result.score ?? result.analysis_data?.overall_score} /></td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{new Date(result.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      <button className="text-xs text-[#2563EB] font-semibold hover:underline">Ko'rish</button>
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
    return (
      <PageSkeletonShell>
        <Skeleton className="h-6 w-40 mb-6" />
        <StatCardsSkeleton count={6} />
        <ChartCardSkeleton className="mb-5" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </PageSkeletonShell>
    );
  }

  const k = data?.kpis;
  const spd = (data?.sessions_per_day ?? []).map(d => ({
    day: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: d.count,
  }));

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <h1 className="text-xl font-bold text-foreground mb-6">Analitika</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
          <StatCard icon={<Users size={16} />} label="O'quvchilar" value={k?.total_users ?? 0} iconColor="#2563EB" />
          <StatCard icon={<Activity size={16} />} label="Mashg'ulotlar" value={k?.total_sessions ?? 0} iconColor="#0D9488" />
          <StatCard icon={<MessageSquare size={16} />} label="Tahlillar" value={k?.total_analyses ?? 0} iconColor="#7C3AED" />
          <StatCard icon={<Target size={16} />} label="O'rtacha ball" value={k?.average_score ?? "—"} iconColor="#16A34A" />
          <StatCard icon={<Flame size={16} />} label="Faol (7 kun)" value={k?.active_users_7d ?? 0} iconColor="#D97706" />
          <StatCard icon={<Zap size={16} />} label="Savollar" value={k?.active_questions ?? 0} iconColor="#DB2777" />
        </div>

        {/* Sessions per day */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Mashg'ulotlar — oxirgi 14 kun</h2>
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
            <h2 className="text-sm font-bold text-foreground mb-4">Ball taqsimoti</h2>
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
            <h2 className="text-sm font-bold text-foreground mb-4">Qismlar bo'yicha mashq</h2>
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
  const [deleteTarget, setDeleteTarget] = useState<SpeakingQuestion | null>(null);
  const [qSearch, setQSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

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
  const filtered = questions.filter(q => {
    if (filterPart && q.part !== filterPart) return false;
    if (qSearch.trim() && !q.question.toLowerCase().includes(qSearch.toLowerCase())) return false;
    if (statusFilter === "active" && !q.is_active) return false;
    if (statusFilter === "inactive" && q.is_active) return false;
    return true;
  });

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
    return (
      <PageSkeletonShell>
        <PageHeaderSkeleton action />
        <div className="flex items-center gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-lg" />)}
        </div>
        <TableSkeleton rows={6} cols={3} />
      </PageSkeletonShell>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-[1040px] w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Speaking savollari</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{counts.all} jami · botda o'quvchilarga ko'rsatiladi</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all"
          >
            <Plus size={16} />
            Savol qo'shish
          </button>
        </div>

        {showAdd && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Yangi savol</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Qism</label>
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
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Savol</label>
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
                Saqlash
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-muted hover:bg-muted/70 text-muted-foreground rounded-lg text-sm font-semibold">
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Part filter tabs */}
            {[
              { id: null as number | null, label: `Hammasi (${counts.all})` },
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

            {/* Status filter */}
            <div className="flex items-center gap-1 pl-1 ml-1 border-l border-border">
              {[
                { id: "all" as const, label: "Hammasi" },
                { id: "active" as const, label: "Faol" },
                { id: "inactive" as const, label: "Nofaol" },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === s.id ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={qSearch}
              onChange={e => setQSearch(e.target.value)}
              placeholder="Savollarni qidirish..."
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground w-56"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Qism", "Savol", "Faol", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Savollar yo'q. Yuqoridan qo'shing.</td></tr>
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
                          title="Botda ko'rinishini o'zgartirish"
                          className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${question.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          {question.is_active ? 'Faol' : 'Nofaol'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button onClick={handleUpdate} className="text-xs text-green-600 font-semibold hover:underline">Saqlash</button>
                            <button onClick={() => setEditing(null)} className="text-xs text-gray-600 font-semibold hover:underline">Bekor qilish</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEdit(question)} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                              <Edit size={12} /> Tahrirlash
                            </button>
                            <button onClick={() => setDeleteTarget(question)} className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1">
                              <Trash2 size={12} /> O'chirish
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

        <ConfirmDialog
          open={!!deleteTarget}
          title="Savolni o'chirish"
          message="Bu savol butunlay o'chiriladi. Davom etasizmi?"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => { if (deleteTarget) { await handleDelete(deleteTarget.id); setDeleteTarget(null); } }}
        />
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
