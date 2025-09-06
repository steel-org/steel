import { ApiResponse, AuthResponse, Chat, Message, MessagesResponse, User } from '@/types';

const API_BASE_URL = (() => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol;
    const host = window.location.hostname; 
    return `${proto}//${host}:5000`;
  }
  return 'http://localhost:5000';
})();

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('biuld_token', token);
    }
  }

  // Web Push
  async getVapidPublicKey(): Promise<string> {
    const response = await this.request<{ publicKey: string }>(`/api/push/vapidPublicKey`);
    const d: any = response as any;
    const key = d?.data?.publicKey ?? (d?.publicKey ?? "");
    return key;
  }

  async pushSubscribe(subscription: PushSubscriptionJSON): Promise<void> {
    await this.request(`/api/push/subscribe`, {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  }

  async pushUnsubscribe(subscription: PushSubscriptionJSON): Promise<void> {
    await this.request(`/api/push/unsubscribe`, {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('biuld_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('biuld_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth = false
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const config: RequestInit = {
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...(!skipAuth && token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 204) {
        return { success: true, data: {} as T };
      }
      
      const data = await response.json();

      if (!response.ok) {
        if (endpoint === '/api/auth/logout' && response.status === 401) {
          this.clearToken();
          return { success: true, data: { message: 'Logged out successfully' } as T };
        }
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Unauthorized');
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw error;
      }
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return response.data!;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return response.data!;
  }

  async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      const token = this.getToken();
      
      this.clearToken();
      
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok && response.status !== 401) {
            console.warn('Logout API call failed with status:', response.status);
          }
        } catch (error) {
          console.warn('Error during logout API call:', error);
        }
      }
      
      localStorage.removeItem('biuld_token');
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      this.clearToken();
      localStorage.removeItem('biuld_token');
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      return { 
        success: true, 
        message: 'Logged out (some cleanup operations may have failed)' 
      };
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>('/api/auth/me');
    return response.data!;
  }

  // Chats
  async getChats(): Promise<Chat[]> {
    const response = await this.request<Chat[]>('/api/chats');
    return response.data!;
  }

  async getChat(chatId: string): Promise<Chat> {
    const response = await this.request<Chat>(`/api/chats/${chatId}`);
    return response.data!;
  }

  async createChat(data: {
    name?: string;
    type: 'DIRECT' | 'GROUP';
    memberIds: string[];
  }): Promise<Chat> {
    const response = await this.request<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async updateChat(chatId: string, data: { name?: string; avatar?: string }): Promise<Chat> {
    const response = await this.request<Chat>(`/api/chats/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async addChatMembers(chatId: string, memberIds: string[]): Promise<Chat> {
    const response = await this.request<Chat>(`/api/chats/${chatId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
    return response.data!;
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.request(`/api/chats/${chatId}`, { method: 'DELETE' });
  }

  // Messages
  async getMessages(chatId: string, page = 1, limit = 50): Promise<MessagesResponse> {
    const response = await this.request<MessagesResponse>(
      `/api/messages/chat/${chatId}?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await this.request<Message>(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    return response.data!;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.request(`/api/messages/${messageId}`, { method: 'DELETE' });
  }

  // Users
  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const response = await this.request<User[]>(`/api/users?q=${query}&limit=${limit}`);
    return response.data!;
  }

  async getUser(userId: string): Promise<User> {
    const response = await this.request<User>(`/api/users/${userId}`);
    return response.data!;
  }

  async updateProfile(data: { 
    username?: string; 
    avatar?: string; 
    displayName?: string; 
    bio?: string; 
    location?: string; 
    website?: string; 
  }): Promise<User> {
    const response = await this.request<User>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  // Files
  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.request('/api/files/upload', {
      method: 'POST',
      headers: {}, 
      body: formData,
    });
    return response.data!;
  }

  async getFile(fileId: string): Promise<any> {
    const response = await this.request(`/api/files/${fileId}`);
    return response.data!;
  }

  async downloadFile(fileId: string, filename?: string): Promise<void> {
    const url = `${API_BASE_URL}/api/files/${fileId}/download`;
    const token = this.getToken();
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!resp.ok) {
      try {
        const j = await resp.json();
        throw new Error(j?.error || `Download failed (${resp.status})`);
      } catch (_) {
        throw new Error(`Download failed (${resp.status})`);
      }
    }

    // Get filename from content-disposition or use provided filename
    let finalFilename = filename || `file-${fileId}`;
    const contentDisposition = resp.headers.get('content-disposition');
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) finalFilename = match[1].replace(/['"]/g, '');
    }

    // Create and trigger download
    const blob = await resp.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
  }

  async downloadViaProxy(fileUrl: string, name?: string): Promise<string> {
    const token = this.getToken();
    const url = new URL(`${API_BASE_URL}/api/files/download-proxy`);
    url.searchParams.set('url', fileUrl);
    if (name) url.searchParams.set('name', name);
    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      try {
        const j = await resp.json();
        throw new Error(j?.error || `Download failed (${resp.status})`);
      } catch (_) {
        throw new Error(`Download failed (${resp.status})`);
      }
    }
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  // Avatars
  async uploadAvatar(file: File): Promise<string> {
    const form = new FormData();
    form.append('avatar', file);
    const response = await this.request<any>(`/api/upload/avatar`, {
      method: 'POST',
      body: form,
    });
    const d: any = response as any;
    const url = d?.data?.avatarUrl ?? d?.avatarUrl;
    if (!url) {
      const err = d?.error || 'Avatar URL missing in response';
      throw new Error(err);
    }
    return url;
  }

  // Chat files
  async uploadChatFile(file: File, signal?: AbortSignal): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.request(`/api/upload/chat-file`, {
      method: 'POST',
      body: form,
      ...(signal ? { signal } : {}),
    });
    return response.data as any; // { url, path, size, type, originalName }
  }

  async saveFileMetadata(data: {
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
    chatId?: string;
    messageId?: string;
  }, signal?: AbortSignal): Promise<any> {
    const response = await this.request(`/api/files/save-metadata`, {
      method: 'POST',
      body: JSON.stringify(data),
      ...(signal ? { signal } : {}),
    });
    return response.data as any; // attachment object with id
  }
}

export const apiService = new ApiService(); 