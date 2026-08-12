/**
 * Type-safe API response interfaces for Krashaq Frontend
 */

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'farmer' | 'pestisides-supplier';
  language: string;
  location?: {
    state?: string;
    district?: string;
    tehsil?: string;
    locality?: string;
    pincode?: string;
  };
  soil_moisture?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface SignupResponse {
  message: string;
  user: User;
}

// Chat Types
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  updated_at?: string;
  tools_used?: string[];
  detected_crop?: string;
  llm_provider: string;
  weather?: WeatherData;
  type?: 'text' | 'image' | 'file';
  status?: 'pending' | 'sent' | 'failed';
  reply_to?: string;
  is_starred?: boolean;
  retry_count?: number;
  quality_score?: number;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  language: string;
  tools_used: string[];
  detected_crop?: string;
  llm_provider: string;
  weather?: WeatherData;
  reflection_count: number;
  quality_score: number;
}

export interface MessageThread {
  message_id: string;
  thread: ChatMessage[];
  total_count: number;
}

// Weather Types
export interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  condition: string;
  wind_speed: number;
  rain: number;
  clouds: number;
  success: boolean;
  location_hierarchy?: {
    locality?: string;
    tehsil?: string;
    district?: string;
    state?: string;
    city?: string;
  };
}

// LLM Types
export interface LLMProvider {
  name: string;
  display_name: string;
  default_model: string;
  models: string[];
  available: boolean;
}

export interface LLMSessionStats {
  total_sessions: number;
  active_sessions: number;
  avg_messages_per_session: number;
  total_tokens_used: number;
}

export interface LLMMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  total_tokens: number;
  avg_tokens_per_request: number;
}

// Admin Types
export interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
  admin_id: string;
  admin_name: string;
  ip_address?: string;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  by_role: Record<string, number>;
  by_language: Record<string, number>;
}

export interface DashboardStats {
  users: UserStats;
  chat: {
    total_messages: number;
    messages_today: number;
    avg_response_time: number;
    active_sessions: number;
  };
  weather: {
    total_requests: number;
    requests_today: number;
  };
  system: {
    uptime: number;
    memory_usage: number;
    cpu_usage: number;
  };
}

export interface SystemHealth {
  mongodb: {
    status: 'healthy' | 'unhealthy';
    latency: number;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    latency: number;
  };
  llm_provider: {
    status: 'healthy' | 'unhealthy';
    latency: number;
    provider: string;
  };
  twilio: {
    status: 'healthy' | 'unhealthy';
    latency: number;
  };
}

export interface FlaggedContent {
  id: string;
  type: 'message' | 'user' | 'content';
  content: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
}

export interface Config {
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  updated_at: string;
}

export interface SchedulerConfig {
  id: string;
  name: string;
  job_type: string;
  interval: string;
  enabled: boolean;
  last_run: string;
  next_run: string;
  status: 'idle' | 'running' | 'error';
  config: Record<string, unknown>;
}

// Farmer Types
export interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: {
    state: string;
    district: string;
    tehsil: string;
    locality?: string;
    pincode?: string;
  };
  soil_moisture?: number;
  language: string;
  created_at: string;
  updated_at: string;
}

// Location Types
export interface Location {
  name: string;
  code?: string;
}

// Pagination Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Search Types
export interface SearchFilters {
  query?: string;
  date_from?: string;
  date_to?: string;
  type?: string;
  status?: string;
}

// Session Types
export interface Session {
  id: string;
  user_id: string;
  device_type: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location?: string;
  created_at: string;
  last_active: string;
  is_active: boolean;
}

// 2FA Types
export interface TwoFactorSetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface BackupCode {
  code: string;
  used: boolean;
  used_at?: string;
}

// Export Types
export interface ExportOptions {
  format: 'json' | 'csv' | 'txt';
  date_from?: string;
  date_to?: string;
  include_metadata?: boolean;
}

// Error Types
export interface ApiErrorResponse {
  detail: string;
  error?: string;
  code?: string;
}
