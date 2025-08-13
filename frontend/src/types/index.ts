export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: string;
  createdAt: string;
  bio?: string;
  location?: string;
  website?: string;
  roles?: string[];
  messageCount?: number;
  chatCount?: number;
}

export interface Chat {
  id: string;
  name?: string;
  type: 'DIRECT' | 'GROUP';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  members: ChatMember[];
  participants: string[]; 
  owner?: User;
  unreadCount?: number;
  isGroup?: boolean; 
}

export interface ChatMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
  user: User;
}

export interface Message {
  id: string;
  chatId?: string;  // Added this line to fix the TypeScript error
  content: string;
  type: 'TEXT' | 'CODE' | 'FILE' | 'SYSTEM';
  status: 'SENT' | 'DELIVERED' | 'READ';
  replyToId?: string;
  language?: string;
  filename?: string;
  lines?: number;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  sender: User;
  replyTo?: Message;
  attachments: Attachment[];
  reactions: MessageReaction[];
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnail?: string;
  createdAt: string;
}

export interface MessageReaction {
  id: string;
  reaction: string;
  createdAt: string;
  user: User;
}

export interface MessageEdit {
  id: string;
  oldContent: string;
  newContent: string;
  editedAt: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: Pagination;
}

export interface ChatResponse {
  chat: Chat;
  messages: MessagesResponse;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SocketEvent {
  event: string;
  payload: any;
}

export interface TypingEvent {
  userId: string;
  username: string;
  isTyping: boolean;
  chatId: string;
}

export interface MessageEvent {
  message: Message;
}

export interface ReactionEvent {
  messageId: string;
  reaction: string;
  userId: string;
  username: string;
  chatId: string;
}

export interface UserStatusEvent {
  userId: string;
  username: string;
  status: string;
}

export interface CodeReview {
  originalFileId: string;
  patchDiff: string;
  reviewerId: string;
  comment: string;
}

export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface SearchResult {
  type: 'message' | 'user' | 'file';
  id: string;
  title: string;
  content?: string;
  metadata?: any;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  timestamp?: number;
  chatId?: string;
  read?: boolean;
} 