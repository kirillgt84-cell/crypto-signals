const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Signal {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  target_price: number;
  stop_price: number;
  status: string;
  confidence: number;
  created_at: string;
}

export interface Account {
  id: number;
  user_id: number;
  symbol: string;
  balance: number;
  initial_balance: number;
}

export interface AccountStats {
  total_trades: number;
  balance: number;
}

export interface CreateAccountRequest {
  user_id: number;
  symbol: string;
  initial_balance?: number;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export const api = {
  // Health check
  health: () => fetchApi<{ status: string }>('/health'),
  
  // Signals
  getSignals: () => fetchApi<Signal[]>('/api/v1/signals'),
  
  // Paper Trading Accounts
  createAccount: (data: CreateAccountRequest) => 
    fetchApi<Account>(`/api/v1/paper/accounts?user_id=${data.user_id}&symbol=${data.symbol}&initial_balance=${data.initial_balance || 10000}`, {
      method: 'POST',
    }),
  
  getAccountStats: (accountId: number) => 
    fetchApi<AccountStats>(`/api/v1/paper/accounts/${accountId}/stats`),
};
