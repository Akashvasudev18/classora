import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./pages/Home";
import { HostDashboard } from "./pages/HostDashboard";
import { JoinPage } from "./pages/JoinPage";
import { StudentClassroom } from "./pages/StudentClassroom";
import { ClassEndedPage } from "./pages/ClassEndedPage";
import { ErrorPage } from "./pages/ErrorPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/host/:roomCode" element={<HostDashboard />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/classroom/:roomCode" element={<StudentClassroom />} />
        <Route path="/class-ended" element={<ClassEndedPage />} />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
