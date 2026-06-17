
const API_BASE = "http://localhost:8000/api/v1";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface AdminResponse {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface TelegramUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
  native_language: string;
  english_level: string;
  target_band: string;
  is_active: boolean;
  created_at: string;
  total_sessions?: number;
  average_score?: number | null;
  best_score?: number | null;
  last_active?: string | null;
}

interface UserDetail {
  user: TelegramUser;
  stats: {
    total_sessions: number;
    average_score: number | null;
    best_score: number | null;
    latest_score: number | null;
    streak: number;
    last_active: string | null;
    part_counts: Record<string, number>;
  };
  score_history: { score: number; created_at: string }[];
  sessions: {
    id: number;
    practice_mode: string;
    question: string;
    score: number | null;
    created_at: string;
  }[];
  latest_analysis: {
    id: number;
    transcript: string;
    analysis_data: any;
    created_at: string;
  } | null;
}

interface Analytics {
  kpis: {
    total_users: number;
    total_sessions: number;
    total_analyses: number;
    active_questions: number;
    average_score: number | null;
    active_users_7d: number;
  };
  sessions_per_day: { date: string; count: number }[];
  score_distribution: { range: string; count: number }[];
  part_distribution: { name: string; value: number }[];
}

interface PracticeSession {
  id: number;
  telegram_user_id: number;
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
  created_at: string;
}

interface SpeakingQuestionCreate {
  part: number;
  question: string;
}

interface SpeakingQuestionUpdate {
  part?: number;
  question?: string;
  is_active?: boolean;
}

interface AdminStats {
  total_users: number;
  total_sessions: number;
  total_analyses: number;
  total_questions: number;
}

export const api = {
  setToken: (token: string) => {
    localStorage.setItem("adminToken", token);
  },
  getToken: () => {
    return localStorage.getItem("adminToken");
  },
  clearToken: () => {
    localStorage.removeItem("adminToken");
  },
  register: async (email: string, password: string): Promise<AdminResponse> => {
    const res = await fetch(`${API_BASE}/admin/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Failed to register");
    return res.json();
  },
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Invalid credentials");
    return res.json();
  },
  getMe: async (): Promise<AdminResponse> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },
  getStats: async (): Promise<AdminStats> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },
  getUsers: async (): Promise<TelegramUser[]> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },
  getUserDetail: async (id: number): Promise<UserDetail> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch student detail");
    return res.json();
  },
  getAnalytics: async (): Promise<Analytics> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },
  getSessions: async (): Promise<PracticeSession[]> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch sessions");
    return res.json();
  },
  getResults: async (): Promise<AnalysisResult[]> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/results`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch results");
    return res.json();
  },
  getQuestions: async (part?: number): Promise<SpeakingQuestion[]> => {
    const token = api.getToken();
    let url = `${API_BASE}/admin/questions`;
    if (part) url += `?part=${part}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch questions");
    return res.json();
  },
  createQuestion: async (question: SpeakingQuestionCreate): Promise<SpeakingQuestion> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/questions`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(question),
    });
    if (!res.ok) throw new Error("Failed to create question");
    return res.json();
  },
  updateQuestion: async (id: number, update: SpeakingQuestionUpdate): Promise<SpeakingQuestion> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error("Failed to update question");
    return res.json();
  },
  deleteQuestion: async (id: number): Promise<void> => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete question");
  },
};
