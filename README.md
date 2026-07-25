# Classora - Live Learning Platform

Classora is a high-performance, production-ready real-time collaborative learning platform built with React, Vite, TypeScript, TailwindCSS, Express, and Socket.IO.

---

## 🌐 Live Production Links

- **Frontend Application (Vercel)**: **[https://client-nine-sand-55.vercel.app](https://client-nine-sand-55.vercel.app)**
- **Backend Server (Render 24/7 Cloud)**: **[https://classora-3s1d.onrender.com](https://classora-3s1d.onrender.com)**

---

## 🚀 Key Features

- ⚡ **Zero Database In-Memory Architecture**: All room state and live editor synchronizations are handled purely in memory.
- 🐍 **Python Monaco Editor**: Teacher types in a VS Code Dark Python editor powered by `@monaco-editor/react`. Students receive a real-time read-only Monaco view.
- 🔒 **Waiting Room Access Control**: Teachers accept or reject student join requests in real time with 1-tap "Accept All" capabilities.
- 📱 **Mobile & Multi-Device Support**: Responsive layout featuring urgent pending alert banners and automatic top-positioning of waiting room requests on small screens.
- 🛑 **Complete "End Class" Workflow**: Closing a classroom purges memory immediately and redirects all students to a "Class Ended" screen.
- 🎨 **Modern Dark Zoom Aesthetic**: Sleek glassmorphism, glowing blue accents (`#2D8CFF`), status badges, and smooth micro-animations.

---

## 🛠️ Tech Stack

### Frontend (`client/`)
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Editor**: `@monaco-editor/react` (Python / VS Code Dark)
- **Styling**: TailwindCSS + Custom Glassmorphism Utilities
- **Routing**: React Router v6
- **Real-Time Engine**: Socket.IO Client + Singleton `SocketService`
- **Icons**: Lucide React

### Backend (`server/`)
- **Runtime**: Node.js + Express
- **Language**: TypeScript (`tsx`)
- **Real-Time Engine**: Socket.IO
- **Deployment**: Render (`render.yaml`)
- **Utilities**: CORS, UUID

---

## 📁 Project Structure

```text
classora/
├── client/                 # Frontend React SPA
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── common/     # Avatar, StatusBadge, LoadingSpinner
│   │   │   └── classroom/  # LiveEditor (Monaco), WaitingRoomPanel, StudentListPanel
│   │   ├── pages/          # Home, HostDashboard, JoinPage, StudentClassroom, ClassEndedPage, ErrorPage
│   │   ├── services/       # SocketService singleton & status hooks
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
├── render.yaml             # Render 1-click Web Service Deployment Config
└── package.json            # Root workspace script runner
```

---

## 💻 Local Development

```bash
# Install root dependencies
npm install

# Start Backend Server (Port 5000)
cd server
npm run dev

# Start Frontend Dev Server (Port 5173)
cd ../client
npm run dev
```

Visit `http://localhost:5173` in your browser.
