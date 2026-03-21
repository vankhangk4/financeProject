const API_BASE = '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.token = null;
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated() {
    return !!this.token;
  }

  // Auth
  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Accounts
  async getAccounts() {
    return this.request<any[]>('/accounts/');
  }

  async createAccount(data: { name: string; account_type: string; currency?: string; icon?: string }) {
    return this.request('/accounts/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAccount(id: number, data: Partial<{ name: string; currency: string; icon: string; account_type: string }>) {
    return this.request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAccount(id: number) {
    return this.request(`/accounts/${id}`, { method: 'DELETE' });
  }

  async transfer(data: { from_account_id: number; to_account_id: number; amount: number; description?: string; date: string }) {
    return this.request('/accounts/transfer', { method: 'POST', body: JSON.stringify(data) });
  }

  // Categories
  async getCategories() {
    return this.request<any[]>('/categories/');
  }

  async initDefaultCategories() {
    return this.request('/categories/init-default', { method: 'POST' });
  }

  async createCategory(data: { name: string; icon?: string; color?: string; parent_id?: number }) {
    return this.request('/categories/', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteCategory(id: number) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // Transactions
  async getTransactions(params?: { account_id?: number; category_id?: number; start_date?: string; end_date?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => v !== undefined && searchParams.set(k, String(v)));
    }
    const qs = searchParams.toString();
    return this.request<any[]>(`/transactions/${qs ? '?' + qs : ''}`);
  }

  async createTransaction(data: {
    account_id: number;
    category_id?: number;
    amount: number;
    transaction_type: string;
    description?: string;
    date: string;
  }) {
    return this.request('/transactions/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTransaction(id: number, data: Partial<{ category_id: number; description: string }>) {
    return this.request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteTransaction(id: number) {
    return this.request(`/transactions/${id}`, { method: 'DELETE' });
  }

  // Budgets
  async getBudgets() {
    return this.request<any[]>('/budgets/');
  }

  async createBudget(data: { category_id: number; amount: number; period?: string }) {
    return this.request('/budgets/', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateBudget(id: number, data: Partial<{ amount: number; period: string }>) {
    return this.request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteBudget(id: number, password: string) {
    const formData = new FormData();
    formData.append('password', password);
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${API_BASE}/budgets/${id}`, {
      method: 'DELETE',
      headers,
      body: formData,
    });
    if (response.status === 204 || response.status === 200) {
      return;
    }
    if (response.status === 401) {
      this.token = null;
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<any>('/dashboard/stats');
  }

  // Reports
  async getMonthlyReports(months?: number) {
    return this.request<any[]>(`/reports/monthly?months=${months || 6}`);
  }

  // AI
  async categorizeTransaction(description: string, amount?: number) {
    return this.request<any>(`/ai/categorize`, {
      method: 'POST',
      body: JSON.stringify({ description, amount }),
    });
  }

  async getCashFlowPrediction(months?: number) {
    return this.request<any[]>(`/ai/predict-cashflow?months=${months || 3}`);
  }

  async getAnomalyAlerts() {
    return this.request<any[]>('/ai/anomaly-alerts');
  }

  // Chatbot
  async chat(message: string, sessionId?: number) {
    return this.request<{ response: string; sources?: string[]; session_id?: number }>('/chatbot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    });
  }

  // Chat Sessions
  async getChatSessions() {
    return this.request<any[]>('/chatbot/sessions/');
  }

  async createChatSession(title?: string) {
    return this.request<any>('/chatbot/sessions/', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getChatSession(id: number) {
    return this.request<any>(`/chatbot/sessions/${id}`);
  }

  async deleteChatSession(id: number) {
    return this.request<void>(`/chatbot/sessions/${id}`, { method: 'DELETE' });
  }

  async updateChatSession(id: number, title: string) {
    return this.request<any>(`/chatbot/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }
}

export const api = new ApiService();
