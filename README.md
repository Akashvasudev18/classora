# Classora - Live Learning Platform

Classora is a high-performance, production-ready real-time collaborative learning platform built with React, Vite, TypeScript, TailwindCSS, Express, and Socket.IO.

---

## 🚀 Key Features

- ⚡ **Zero Database In-Memory Architecture**: All room state and live editor synchronizations are handled purely in memory.
- 🔒 **Waiting Room Access Control**: Teachers accept or reject student join requests in real time.
- 📝 **Synchronized Live Textarea Editor**: Every keystroke typed by the teacher is broadcast instantly to all connected students.
- 📖 **Read-Only Student Mode**: Students receive a read-only textarea that supports highlighting, selecting text, copying, and scrolling without editing permissions.
- 🛑 **Complete "End Class" Workflow**: Closing a classroom purges memory immediately and redirects all students to a "Class Ended" screen.
- 🎨 **Modern Dark Zoom Aesthetic**: Sleek glassmorphism, glowing blue accents (`#2D8CFF`), status badges, and smooth animations.

---

## 🛠️ Tech Stack

### Frontend (`client/`)
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS + Custom Glassmorphism Utilities
- **Routing**: React Router v6
- **Real-Time Engine**: Socket.IO Client
- **Icons**: Lucide React

### Backend (`server/`)
- **Runtime**: Node.js + Express
- **Language**: TypeScript (`tsx`)
- **Real-Time Engine**: Socket.IO
- **Utilities**: CORS, UUID

---

## 📁 Project Structure

```text
classora/
├── client/                 # Frontend React SPA
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── common/     # Avatar, StatusBadge, LoadingSpinner
│   │   │   └── classroom/  # LiveEditor, WaitingRoomPanel, StudentListPanel
│   │   ├── pages/          # Home, HostDashboard, JoinPage, StudentClassroom, ClassEndedPage, ErrorPage
│   │   ├── services/       # Socket client singleton & status hooks
│   │   ├── App.tsx         # React Router navigation
│   │   └── main.tsx
│   ├── vercel.json         # Vercel SPA routing rewrite config
│   └── package.json
│
├── server/                 # Backend Node.js Express Server
│   ├── src/
│   │   ├── services/       # In-memory RoomManager service
│   │   ├── sockets/        # Socket.IO connection & event handlers
│   │   └── server.ts       # Express app & HTTP server entry point
│   ├── tsconfig.json
│   └── package.json
│
└── package.json            # Root workspace script runner
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ and `npm` installed.

### 2. Installation
Run the workspace installer from the root directory:

```bash
# Install dependencies for both client and server
npm run install:all
```

Alternatively, install in each folder manually:

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Running Locally

#### Start the Backend Server (Port 5000)
```bash
cd server
npm run dev
```

#### Start the Frontend Dev Server (Port 5173)
```bash
cd client
npm run dev
```

Open `http://localhost:5173/` in your browser to view the application.

---

## 🌐 Deployment Instructions

### 1. Deploying Frontend to Vercel

1. Push your code to a GitHub/GitLab repository.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your project repository.
4. Set the **Root Directory** to `client`.
5. Environment Variable:
   - `VITE_SERVER_URL`: URL of your deployed Render backend (e.g. `https://classora-backend.onrender.com`).
6. Click **Deploy**. (The included `client/vercel.json` ensures SPA client-side routes redirect correctly to `index.html`).

---

### 2. Deploying Backend to Render

1. Sign in to [Render](https://render.com/) and create a new **Web Service**.
2. Connect your project repository.
3. Configure settings:
   - **Root Directory**: `server`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   - `PORT`: `5000` (or leave default; Render automatically assigns `PORT`)
5. Click **Create Web Service**.

---

## 🧪 Testing the Complete Workflow

1. Open `http://localhost:5173/` in Browser 1. Click **Host Class**. Note the generated Room Code (e.g. `ABC123`).
2. Open `http://localhost:5173/join` in Browser 2. Enter student name "Alex" and code `ABC123`. Click **Join Class**.
3. In Browser 1 (Host Dashboard), verify "Alex" appears in the **Waiting Room** panel with Accept and Reject buttons.
4. Click **Accept** in Browser 1.
5. In Browser 2 (Student Classroom), verify the screen unlocks to the active classroom view.
6. Type inside the large textarea in Browser 1. Verify every keystroke updates in real time inside Browser 2's read-only textarea.
7. Click **End Class** in Browser 1. Verify Browser 1 redirects to Home (`/`) and Browser 2 is redirected to the **Class Ended** screen.
