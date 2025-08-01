# STEEL

**code. chat. control.**

Steel is a modular, multi-platform developer tool designed to combine real-time collaboration, Git management, terminal access, and a code editor — all in one unified app.

This repository contains will the **first working module** of Steel: a real-time chat system, built to run both in the browser and inside an Electron desktop shell.

---

## 🚀 Current Module: Private Messaging

The private messaging system allows developers to:

- Send and receive private 1-on-1 messages
- Share code snippets with syntax highlighting
- See message status indicators (sent, delivered, read)
- Delete their own messages
- Use @mentions to tag users
- View online/offline status and typing indicators

It works via WebSockets (Socket.io) with localStorage persistence and is deployable for public testing.

---

## 🧱 Tech Stack

| Layer      | Tech                                       |
| ---------- | ------------------------------------------ |
| Frontend   | Next.js (React)                            |
| Styling    | CSS / Tailwind (optional)                  |
| Backend    | Node.js + Express                          |
| Realtime   | Socket.io                                  |
| Deployment | Vercel (frontend), Render/Heroku (backend) |

---

## 📁 Folder Structure

```

steel/
├── frontend/          # Next.js UI
│   └── pages/
│   └── components/
│   └── styles/
├── backend/           # Express + Socket.io
│   └── index.js
├── README.md
└── .gitignore

```

---

## 🔧 Local Setup

### 1. Clone the Repo

```bash
git clone https://github.com/Spectra010s/steel.git
cd steel
```

### 2. Install Dependencies

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd ../frontend
npm install
```

### 3. Run Backend (Socket.io)

```bash
cd backend
npm run dev
# or for production
npm start
```

### 4. Run Frontend (Next.js)

```bash
cd ../frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

### 5. Test the Application

1. Open `http://localhost:3000` in your browser
2. Enter a username and join the chat
3. Open another browser tab/window to test real-time messaging
4. Try sharing code snippets using the code button

---

## ☁️ Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com/)
3. Set environment variable: `NEXT_PUBLIC_BACKEND_URL` = your backend URL
4. Deploy!

### Backend (Render/Heroku)

**Render:**

1. Connect your GitHub repo to [Render](https://render.com/)
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Set environment variable: `NODE_ENV=production`

**Heroku:**

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Create app: `heroku create your-steel-backend`
3. Deploy: `git push heroku main`
4. Set environment: `heroku config:set NODE_ENV=production`

### Environment Variables

**Frontend:**

- `NEXT_PUBLIC_BACKEND_URL`: Your backend server URL

**Backend:**

- `PORT`: Server port (auto-set by hosting)
- `NODE_ENV`: `production` for deployment

---

## 📦 Next Modules (Coming Soon)

- 🔧 Git client (clone, commit, push, diff)
- 💻 Embedded PowerShell terminal
- 🧠 Code editor powered by Monaco
- 🔗 Code sharing & review tools
- 📦 Desktop version via Electron

---

## 📄 License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

**Copyright 2024 Steel Team**

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---

## 🧠 Project Vision

> Steel is not just another code editor. It’s a complete dev environment built for collaboration, control, and communication — all from one place.

Stay tuned.
