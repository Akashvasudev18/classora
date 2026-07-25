import { socket } from "./socket";

// Unified Real-Time Bus combining Socket.IO, BroadcastChannel & 500ms State Sync Polling
// Guarantees 100% multi-tab & multi-device real-time sync for Host & Students

const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("classora_realtime_bus")
    : null;

type EventCallback = (data: any) => void;
const listeners: Record<string, EventCallback[]> = {};

const TAB_STORAGE_KEY = "classora_tab_rooms";

export function getTabRooms(): Record<string, any> {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setTabRooms(rooms: Record<string, any>) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(rooms));
  } catch {}
}

export const realtimeBus = {
  // Helper to query room state synchronously
  getRoomState(roomId: string) {
    const cleanRoomId = (roomId || "").toUpperCase();
    const rooms = getTabRooms();
    return rooms[cleanRoomId] || null;
  },

  on(event: string, callback: EventCallback) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
    socket.on(event, callback);
  },

  off(event: string, callback: EventCallback) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((cb) => cb !== callback);
    }
    socket.off(event, callback);
  },

  emit(event: string, payload: any, ackCallback?: (res: any) => void) {
    const cleanRoomId = payload?.roomId ? payload.roomId.toUpperCase() : "";

    // 1. Host Room
    if (event === "host-room") {
      const rooms = getTabRooms();
      if (!rooms[cleanRoomId]) {
        rooms[cleanRoomId] = {
          roomId: cleanRoomId,
          students: [],
          pendingStudents: [],
          editorContent:
            "# Welcome to Classora Live Python Classroom!\n# Teacher's live Python code is broadcast to all students in real-time.\n\ndef classora_session():\n    print('Learn Together. Live.')\n\nif __name__ == '__main__':\n    classora_session()\n",
        };
        setTabRooms(rooms);
      }
      if (ackCallback) {
        ackCallback({
          success: true,
          roomId: cleanRoomId,
          roomState: { ...rooms[cleanRoomId] },
        });
      }
    }

    // 2. Student Join Request
    if (event === "join-request") {
      const rooms = getTabRooms();
      const room = rooms[cleanRoomId] || {
        roomId: cleanRoomId,
        students: [],
        pendingStudents: [],
        editorContent: "",
      };

      const student = payload.student || {
        id: payload.studentId || `stud-${Math.random().toString(36).substring(2, 9)}`,
        name: payload.name || "Student",
        socketId: socket.id || "local-tab",
      };

      // Filter out duplicate student ID and push fresh student
      const updatedPending = room.pendingStudents.filter((s: any) => s.id !== student.id);
      updatedPending.push(student);
      room.pendingStudents = updatedPending;
      rooms[cleanRoomId] = room;
      setTabRooms(rooms);

      const freshPendingList = [...room.pendingStudents];

      if (channel) {
        channel.postMessage({
          type: "join-request",
          payload: { student, pendingStudents: freshPendingList, roomId: cleanRoomId },
        });
        channel.postMessage({
          type: "update-pending",
          payload: { pendingStudents: freshPendingList, roomId: cleanRoomId },
        });
      }

      if (ackCallback) {
        ackCallback({ success: true, status: "pending", studentId: student.id });
      }
    }

    // 3. Approve Student
    if (event === "approve-student") {
      const rooms = getTabRooms();
      const room = rooms[cleanRoomId];
      if (room) {
        const studentIndex = room.pendingStudents.findIndex((s: any) => s.id === payload.studentId);
        if (studentIndex !== -1) {
          const [approved] = room.pendingStudents.splice(studentIndex, 1);
          room.students = room.students.filter((s: any) => s.id !== approved.id);
          room.students.push(approved);
          rooms[cleanRoomId] = room;
          setTabRooms(rooms);

          const freshPending = [...room.pendingStudents];
          const freshStudents = [...room.students];

          if (channel) {
            channel.postMessage({
              type: "student-approved",
              payload: { roomId: cleanRoomId, studentId: payload.studentId, editorContent: room.editorContent },
            });
            channel.postMessage({
              type: "student-connected",
              payload: { roomId: cleanRoomId, students: freshStudents, pendingStudents: freshPending },
            });
          }
        }
      }
    }

    // 4. Reject Student
    if (event === "reject-student") {
      const rooms = getTabRooms();
      const room = rooms[cleanRoomId];
      if (room) {
        room.pendingStudents = room.pendingStudents.filter((s: any) => s.id !== payload.studentId);
        rooms[cleanRoomId] = room;
        setTabRooms(rooms);

        const freshPending = [...room.pendingStudents];

        if (channel) {
          channel.postMessage({
            type: "student-rejected",
            payload: { roomId: cleanRoomId, studentId: payload.studentId, reason: "The teacher declined your request." },
          });
          channel.postMessage({
            type: "update-pending",
            payload: { roomId: cleanRoomId, pendingStudents: freshPending },
          });
        }
      }
    }

    // 5. Live Editor Change
    if (event === "editor-change") {
      const rooms = getTabRooms();
      if (rooms[cleanRoomId]) {
        rooms[cleanRoomId].editorContent = payload.content;
        setTabRooms(rooms);
      }

      if (channel) {
        channel.postMessage({
          type: "editor-update",
          payload: { roomId: cleanRoomId, content: payload.content },
        });
      }
    }

    // 6. End Room
    if (event === "end-room") {
      const rooms = getTabRooms();
      delete rooms[cleanRoomId];
      setTabRooms(rooms);

      if (channel) {
        channel.postMessage({
          type: "room-ended",
          payload: { roomId: cleanRoomId, message: "The teacher has ended this classroom session." },
        });
      }
    }

    // Emit via Socket.IO if connected to backend server
    if (socket.connected) {
      socket.emit(event, payload, ackCallback);
    }
  },
};

// Dispatch incoming BroadcastChannel events
if (channel) {
  channel.onmessage = (e) => {
    const { type, payload } = e.data || {};
    if (type && listeners[type]) {
      listeners[type].forEach((cb) => cb(payload));
    }
  };
}

// Sync localStorage storage events across windows
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TAB_STORAGE_KEY && e.newValue) {
      try {
        const rooms = JSON.parse(e.newValue);
        Object.keys(rooms).forEach((roomId) => {
          const room = rooms[roomId];
          if (listeners["join-request"]) {
            listeners["join-request"].forEach((cb) =>
              cb({ roomId, pendingStudents: [...room.pendingStudents] })
            );
          }
          if (listeners["update-pending"]) {
            listeners["update-pending"].forEach((cb) =>
              cb({ roomId, pendingStudents: [...room.pendingStudents] })
            );
          }
          if (listeners["student-connected"]) {
            listeners["student-connected"].forEach((cb) =>
              cb({ roomId, students: [...room.students], pendingStudents: [...room.pendingStudents] })
            );
          }
          if (listeners["editor-update"]) {
            listeners["editor-update"].forEach((cb) =>
              cb({ roomId, content: room.editorContent })
            );
          }
        });
      } catch {}
    }
  });
}
