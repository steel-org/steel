import { ApiResponse, AuthResponse, Chat, Message, MessagesResponse, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('biuld_token', token);
    }
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
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
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

  async updateProfile(data: { username?: string; avatar?: string }): Promise<User> {
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

  async downloadFile(fileId: string): Promise<string> {
    const response = await this.request<{ downloadUrl: string }>(`/api/files/${fileId}/download`);
    return response.data!.downloadUrl;
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
  async uploadChatFile(file: File): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.request(`/api/upload/chat-file`, {
      method: 'POST',
      body: form,
    });
    return response.data as any; // { url, path, size, type, originalName }
  }
}

export const apiService = new ApiService(); 