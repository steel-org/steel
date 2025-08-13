# Steel - Modern Desktop Messaging for Developers

**Code. Chat. Control.**

A production-ready desktop chat application built for developers, featuring real-time messaging, code sharing, file attachments, and advanced collaboration features.

## 🚀 Features

### Core Messaging

- **Real-time messaging** with WebSocket connections
- **One-to-one and group chats** with message history
- **Message reactions** and read receipts
- **Typing indicators** and online status
- **Offline message queue** with local persistence

### Developer Features

- **Code sharing** with syntax highlighting (Monaco Editor)
- **Inline code review** and patch creation
- **File attachments** (images, archives, code files)
- **Search functionality** across messages, users, and files
- **Desktop packaging** ready for Electron/Tauri

### Advanced Features

- **Group management** with roles (owner/admin/moderator)
- **File preview** and attachment handling
- **Message editing** and deletion
- **Notification system** for desktop alerts
- **Search and filtering** capabilities

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Real-time**: Socket.IO with WebSocket
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: S3-compatible storage (MinIO/AWS)
- **Desktop**: Electron for cross-platform packaging
- **Code Editor**: Monaco Editor (VSCode-like experience)

### Project Structure

```
steel/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── controllers/    # API route handlers
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation, etc.
│   │   └── websocket/      # Socket.IO event handlers
│   ├── prisma/             # Database schema and migrations
│   └── tests/              # Backend tests
├── frontend/               # React + TypeScript app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API and WebSocket services
│   │   ├── stores/         # State management
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── desktop/                # Electron app wrapper
│   └── src/                # Electron main process
└── shared/                 # Shared types and utilities
    └── types/              # TypeScript interfaces
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis (optional, for session storage)
- MinIO or AWS S3 for file storage

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

#### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/steel_chat"
REDIS_URL="redis://localhost:6379"

# File Storage
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_BUCKET="steel-chat-files"
S3_REGION="us-east-1"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"

# File Upload
MAX_FILE_SIZE=104857600  # 100MB
ALLOWED_FILE_TYPES="image/*,application/zip,text/*,.ste,.py,.c,.cpp,.json"
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_WS_URL="ws://localhost:5000"
NEXT_PUBLIC_APP_NAME="Steel"
```

### Installation

1. **Clone and install dependencies**

```bash
git clone <repository-url>
cd steel

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install desktop dependencies
cd ../desktop
npm install
```

2. **Setup database**

```bash
cd backend
npx prisma generate
npx prisma db push
```

3. **Start development servers**

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Desktop (optional)
cd desktop
npm run dev
```

## 📊 Database Schema

### Core Tables

- `users` - User accounts and profiles
- `chats` - Chat rooms (1:1 or groups)
- `messages` - Chat messages with metadata
- `attachments` - File attachments and metadata
- `chat_members` - User membership in chats
- `message_reactions` - Message reactions
- `message_edits` - Message edit history

### Relationships

- Users can be members of multiple chats
- Messages belong to chats and have senders
- Attachments are linked to messages
- Reactions are linked to messages and users

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Chats

- `GET /api/chats` - List user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat details
- `PUT /api/chats/:id` - Update chat settings

### Messages

- `GET /api/chats/:id/messages` - Get chat messages
- `POST /api/chats/:id/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### Files

- `POST /api/upload` - Upload file
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file

## 🔄 WebSocket Events

### Client → Server

```typescript
// Join chat room
{ event: "join_chat", payload: { chatId: string } }

// Send message
{ event: "send_message", payload: { chatId, content, type, attachments? } }

// Typing indicator
{ event: "typing", payload: { chatId, isTyping: boolean } }

// Message reactions
{ event: "react_to_message", payload: { messageId, reaction: string } }
```

### Server → Client

```typescript
// New message received
{ event: "message_received", payload: Message }

// User typing
{ event: "user_typing", payload: { userId, username, isTyping } }

// Message status update
{ event: "message_status", payload: { messageId, status } }
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm run test
npm run test:watch
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend
npm run test
npm run test:watch
```

### E2E Tests

```bash
npm run test:e2e
```

## 📦 Building for Production

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

### Desktop App

```bash
cd desktop
npm run build
npm run package
```

## 🚀 Deployment

### Backend Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy to your preferred platform (Heroku, Railway, etc.)

### Frontend Deployment

1. Build the application
2. Deploy to Vercel, Netlify, or your preferred platform

### Desktop Distribution

1. Build the desktop app
2. Create installers for Windows, macOS, and Linux
3. Distribute through your preferred channels

## 🔒 Security Considerations

- JWT-based authentication
- File type and size validation
- Rate limiting on API endpoints
- CORS configuration
- Input sanitization
- SQL injection prevention via Prisma
- XSS protection

## 📋 Version History

See [VERSIONING.md](./VERSIONING.md) for full release history and details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Join our community chat

---

**Steel** - Code. Chat. Control. 🚀

