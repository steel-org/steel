import { ApiResponse, AuthResponse, Chat, Message, MessagesResponse, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('steel_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('steel_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('steel_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
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

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.clearToken();
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
}

export const apiService = new ApiService(); 