import { Server, Socket } from "socket.io";
import { roomManager } from "../services/roomManager.js";
import { v4 as uuidv4 } from "uuid";

export const setupSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Initial connection handshake
    socket.emit("connected", {
      status: "connected",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // 1. Host Room Event
    socket.on("host-room", ({ roomId: requestedCode }: { roomId?: string }, callback) => {
      const roomId = requestedCode
        ? requestedCode.toUpperCase()
        : uuidv4().substring(0, 6).toUpperCase();

      let room = roomManager.getRoom(roomId);
      if (!room) {
        room = roomManager.createRoom(roomId, socket.id);
      } else {
        roomManager.setTeacherSocket(roomId, socket.id);
      }

      socket.join(roomId);
      console.log(`[Host] Host ${socket.id} active in room ${roomId}. Pending students: ${room.pendingStudents.length}`);

      const response = {
        success: true,
        roomId,
        roomState: room,
      };

      // Broadcast updated pending & student lists to host room
      io.to(roomId).emit("update-pending", {
        roomId,
        pendingStudents: room.pendingStudents,
      });

      if (typeof callback === "function") {
        callback(response);
      } else {
        socket.emit("host-room-success", response);
      }
    });

    // 2. Room Check & State Fetch Event
    socket.on("check-room", ({ roomId }: { roomId: string }, callback) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (typeof callback === "function") {
        callback({ exists: !!room, roomId: cleanRoomId, roomState: room || null });
      }
    });

    socket.on("get-room-state", ({ roomId }: { roomId: string }, callback) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (typeof callback === "function") {
        callback({ success: true, roomId: cleanRoomId, roomState: room || null });
      }
    });

    // 3. Student Join Request Event
    socket.on("join-request", ({ roomId, studentId, name }: { roomId: string; studentId: string; name: string }, callback) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      let room = roomManager.getRoom(cleanRoomId);

      // Auto-create room in memory if not present yet so request is never lost
      if (!room) {
        room = roomManager.createRoom(cleanRoomId, "");
      }

      const student = { id: studentId || uuidv4(), name: name || "Student", socketId: socket.id };
      roomManager.addPendingStudent(cleanRoomId, student);
      socket.join(cleanRoomId);

      console.log(`[Join Request] Student "${student.name}" (${student.id}) joined waiting room for ${cleanRoomId}`);

      const payload = {
        roomId: cleanRoomId,
        student,
        pendingStudents: room.pendingStudents,
      };

      // Broadcast join request to all sockets in room (host and waiting students)
      io.to(cleanRoomId).emit("join-request", payload);

      if (room.teacherSocket && room.teacherSocket !== socket.id) {
        io.to(room.teacherSocket).emit("join-request", payload);
      }

      if (typeof callback === "function") {
        callback({ success: true, status: "pending", studentId: student.id, roomState: room });
      }
    });

    // 4. Approve Student Event
    socket.on("approve-student", ({ roomId, studentId }: { roomId: string; studentId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (!room) return;

      const approvedStudent = roomManager.approveStudent(cleanRoomId, studentId);
      if (approvedStudent) {
        console.log(`[Approve] Host approved student "${approvedStudent.name}" (${studentId}) in ${cleanRoomId}`);

        io.to(approvedStudent.socketId).emit("student-approved", {
          roomId: cleanRoomId,
          editorContent: room.editorContent,
        });

        io.to(cleanRoomId).emit("student-connected", {
          roomId: cleanRoomId,
          students: room.students,
          pendingStudents: room.pendingStudents,
          count: room.students.length,
        });
      }
    });

    // 5. Reject Student Event
    socket.on("reject-student", ({ roomId, studentId }: { roomId: string; studentId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (!room) return;

      const rejectedStudent = roomManager.rejectStudent(cleanRoomId, studentId);
      if (rejectedStudent) {
        console.log(`[Reject] Host rejected student "${rejectedStudent.name}" (${studentId}) in ${cleanRoomId}`);

        io.to(rejectedStudent.socketId).emit("student-rejected", {
          roomId: cleanRoomId,
          reason: "The teacher declined your request to join this session.",
        });

        io.to(cleanRoomId).emit("update-pending", {
          roomId: cleanRoomId,
          pendingStudents: room.pendingStudents,
        });
      }
    });

    // 6. Live Editor Synchronization Event
    socket.on("editor-change", ({ roomId, content }: { roomId: string; content: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (!room) return;

      roomManager.updateEditorContent(cleanRoomId, content);

      // Broadcast to all other sockets in room
      socket.to(cleanRoomId).emit("editor-update", {
        roomId: cleanRoomId,
        content,
        updatedAt: new Date().toISOString(),
      });
    });

    // 7. End Room Event (Purges memory & notifies everyone)
    socket.on("end-room", ({ roomId }: { roomId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      console.log(`[End Room] Teacher ending room ${cleanRoomId}`);

      io.to(cleanRoomId).emit("room-ended", {
        roomId: cleanRoomId,
        message: "The teacher has ended this classroom session.",
      });

      // Purge room from memory
      roomManager.deleteRoom(cleanRoomId);
    });

    // 8. Handle Disconnection & Memory Cleanup
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
      const affected = roomManager.handleDisconnect(socket.id);

      for (const info of affected) {
        if (info.isTeacher) {
          io.to(info.roomId).emit("teacher-disconnected", {
            roomId: info.roomId,
            message: "The teacher has disconnected.",
          });
        } else {
          const room = roomManager.getRoom(info.roomId);
          if (room) {
            io.to(info.roomId).emit("student-disconnected", {
              roomId: info.roomId,
              socketId: socket.id,
              studentName: info.studentName,
              students: room.students,
              pendingStudents: room.pendingStudents,
              count: room.students.length,
            });
          }
        }
      }
    });
  });
};
