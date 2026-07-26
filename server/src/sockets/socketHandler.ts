import { Server, Socket } from "socket.io";
import { roomManager, PracticeProblem } from "../services/roomManager.js";
import { executePythonCode } from "../services/executionService.js";
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

        const approvalPayload = {
          roomId: cleanRoomId,
          studentId: approvedStudent.id,
          editorContent: room.editorContent,
          activePractice: room.activePractice,
        };

        io.to(approvedStudent.socketId).emit("student-approved", approvalPayload);
        io.to(cleanRoomId).emit("student-approved", approvalPayload);

        io.to(cleanRoomId).emit("student-connected", {
          roomId: cleanRoomId,
          students: room.students,
          pendingStudents: room.pendingStudents,
          count: room.students.length,
          raisedHands: room.raisedHands,
          activeSpeakerId: room.activeSpeakerId,
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

        const rejectionPayload = {
          roomId: cleanRoomId,
          studentId: rejectedStudent.id,
          reason: "The teacher declined your request to join this session.",
        };

        io.to(rejectedStudent.socketId).emit("student-rejected", rejectionPayload);
        io.to(cleanRoomId).emit("student-rejected", rejectionPayload);

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

    // 7. Practice Session Events (Start & End Practice)
    socket.on("start-practice", ({ roomId, practice }: { roomId: string; practice: PracticeProblem }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      console.log(`[Practice Session] Teacher started practice in ${cleanRoomId}: "${practice.title}"`);

      roomManager.startPracticeSession(cleanRoomId, practice);

      const payload = {
        roomId: cleanRoomId,
        practice,
        startedAt: new Date().toISOString(),
      };

      // Broadcast to all students in room
      io.to(cleanRoomId).emit("practice-started", payload);
      io.to(cleanRoomId).emit("receive-practice", payload);
    });

    socket.on("end-practice", ({ roomId }: { roomId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      console.log(`[Practice Session] Teacher ended practice in ${cleanRoomId}`);

      roomManager.endPracticeSession(cleanRoomId);

      const payload = {
        roomId: cleanRoomId,
        endedAt: new Date().toISOString(),
      };

      // Broadcast to all students in room
      io.to(cleanRoomId).emit("practice-ended", payload);
    });

    // Real-Time Student Practice Code Sync Event
    socket.on("sync-student-practice-code", ({ roomId, studentId, code, terminalResult }: { roomId: string; studentId: string; code: string; terminalResult?: any }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      roomManager.updateStudentPracticeState(cleanRoomId, studentId, code, terminalResult);
    });

    // 8. Voice Communication & Permissions Events (Raise Hand / Allow Speaker / Mute All)
    socket.on("raise-hand", ({ roomId, studentId }: { roomId: string; studentId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      roomManager.raiseHand(cleanRoomId, studentId);
      const room = roomManager.getRoom(cleanRoomId);

      console.log(`[Voice] Student ${studentId} raised hand in room ${cleanRoomId}`);

      io.to(cleanRoomId).emit("voice-state-update", {
        roomId: cleanRoomId,
        raisedHands: room?.raisedHands || [],
        activeSpeakerId: room?.activeSpeakerId || null,
      });
    });

    socket.on("lower-hand", ({ roomId, studentId }: { roomId: string; studentId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      roomManager.lowerHand(cleanRoomId, studentId);
      const room = roomManager.getRoom(cleanRoomId);

      console.log(`[Voice] Student ${studentId} lowered hand in room ${cleanRoomId}`);

      io.to(cleanRoomId).emit("voice-state-update", {
        roomId: cleanRoomId,
        raisedHands: room?.raisedHands || [],
        activeSpeakerId: room?.activeSpeakerId || null,
      });
    });

    socket.on("teacher-allow-speaker", ({ roomId, studentId }: { roomId: string; studentId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const { previousSpeakerId } = roomManager.allowSpeaker(cleanRoomId, studentId);
      const room = roomManager.getRoom(cleanRoomId);

      console.log(`[Voice] Teacher approved student ${studentId} to speak in ${cleanRoomId} (Muted previous: ${previousSpeakerId})`);

      io.to(cleanRoomId).emit("voice-state-update", {
        roomId: cleanRoomId,
        raisedHands: room?.raisedHands || [],
        activeSpeakerId: studentId,
        previousSpeakerId,
      });

      // Notify the newly approved student specifically
      const newSpeaker = room?.students.find(s => s.id === studentId || s.socketId === studentId);
      if (newSpeaker) {
        io.to(newSpeaker.socketId).emit("speaker-permission-granted", { roomId: cleanRoomId });
      }

      // Mute the previous speaker if one existed
      if (previousSpeakerId) {
        const prevSpeaker = room?.students.find(s => s.id === previousSpeakerId || s.socketId === previousSpeakerId);
        if (prevSpeaker) {
          io.to(prevSpeaker.socketId).emit("speaker-permission-revoked", { roomId: cleanRoomId });
        }
      }
    });

    socket.on("teacher-remove-speaker", ({ roomId, studentId }: { roomId: string; studentId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      roomManager.removeSpeaker(cleanRoomId, studentId);
      const room = roomManager.getRoom(cleanRoomId);

      console.log(`[Voice] Teacher muted student ${studentId} in ${cleanRoomId}`);

      const targetStudent = room?.students.find(s => s.id === studentId || s.socketId === studentId);
      if (targetStudent) {
        io.to(targetStudent.socketId).emit("speaker-permission-revoked", { roomId: cleanRoomId });
      }

      io.to(cleanRoomId).emit("voice-state-update", {
        roomId: cleanRoomId,
        raisedHands: room?.raisedHands || [],
        activeSpeakerId: room?.activeSpeakerId || null,
      });
    });

    socket.on("mute-all", ({ roomId }: { roomId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      const currentSpeakerId = room?.activeSpeakerId;

      if (currentSpeakerId) {
        const activeStudent = room?.students.find(s => s.id === currentSpeakerId || s.socketId === currentSpeakerId);
        if (activeStudent) {
          io.to(activeStudent.socketId).emit("speaker-permission-revoked", { roomId: cleanRoomId });
        }
      }

      roomManager.muteAllStudents(cleanRoomId);

      console.log(`[Voice] Teacher muted ALL students in ${cleanRoomId}`);

      io.to(cleanRoomId).emit("all-students-muted", { roomId: cleanRoomId });
      io.to(cleanRoomId).emit("voice-state-update", {
        roomId: cleanRoomId,
        raisedHands: [],
        activeSpeakerId: null,
      });
    });

    // 9. Web Audio API Raw PCM Audio Sample Relay (Guaranteed 100% Mobile & Cross-Tab Voice Audio)
    socket.on("broadcast-pcm-audio", ({ roomId, pcmSamples, sampleRate, senderName }: { roomId: string; pcmSamples: number[]; sampleRate?: number; senderName?: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      // Broadcast raw PCM sample buffer to all other sockets in room
      socket.to(cleanRoomId).emit("receive-pcm-audio", {
        pcmSamples,
        sampleRate: sampleRate || 16000,
        senderName: senderName || "Classroom Speaker",
        senderSocketId: socket.id,
        roomId: cleanRoomId,
      });
    });

    // 10. WebRTC Signaling Events
    socket.on("webrtc-offer", ({ roomId, targetSocketId, offer }: { roomId: string; targetSocketId?: string; offer: any }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-offer", { offer, senderSocketId: socket.id, roomId: cleanRoomId });
      } else {
        socket.to(cleanRoomId).emit("webrtc-offer", { offer, senderSocketId: socket.id, roomId: cleanRoomId });
      }
    });

    socket.on("webrtc-answer", ({ roomId, targetSocketId, answer }: { roomId: string; targetSocketId: string; answer: any }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      io.to(targetSocketId).emit("webrtc-answer", { answer, senderSocketId: socket.id, roomId: cleanRoomId });
    });

    socket.on("webrtc-ice-candidate", ({ roomId, targetSocketId, candidate }: { roomId: string; targetSocketId?: string; candidate: any }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-ice-candidate", { candidate, senderSocketId: socket.id, roomId: cleanRoomId });
      } else {
        socket.to(cleanRoomId).emit("webrtc-ice-candidate", { candidate, senderSocketId: socket.id, roomId: cleanRoomId });
      }
    });

    // 11. Teacher Student Code Inspection & Live Assistance Events
    socket.on("request-student-code", ({ roomId, studentId }: { roomId: string; studentId: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (!room) return;

      const targetStudent = room.students.find((s) => s.id === studentId || s.socketId === studentId || s.socketId === socket.id);
      if (targetStudent) {
        console.log(`[Inspection] Teacher requesting code & terminal from student "${targetStudent.name}" (${targetStudent.id})`);
        io.to(targetStudent.socketId).emit("request-student-code", {
          teacherSocketId: socket.id,
          studentId: targetStudent.id,
        });
      }
    });

    socket.on("send-student-code", ({ teacherSocketId, studentId, studentName, code, terminalResult }: { teacherSocketId: string; studentId: string; studentName: string; code: string; terminalResult?: any }) => {
      // Find room containing target student socket or teacher socket
      for (const roomId of Object.keys(roomManager.getAllRooms())) {
        const room = roomManager.getRoom(roomId);
        if (room) {
          const s = room.students.find(st => st.id === studentId || st.socketId === socket.id);
          if (s) {
            roomManager.updateStudentPracticeState(roomId, s.id, code, terminalResult);
            break;
          }
        }
      }

      console.log(`[Inspection] Received code & terminal from student "${studentName}". Relaying to teacher ${teacherSocketId}`);
      io.to(teacherSocketId).emit("receive-student-code", {
        studentId,
        studentName,
        code,
        terminalResult,
        timestamp: new Date().toISOString(),
      });
    });

    // Teacher pushes code edit directly to student
    socket.on("teacher-edit-student-code", ({ roomId, studentId, code }: { roomId: string; studentId: string; code: string }) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (!room) return;

      const targetStudent = room.students.find((s) => s.id === studentId || s.socketId === studentId);
      if (targetStudent) {
        targetStudent.practiceCode = code;
        console.log(`[Teacher Assistance] Teacher pushing code edit to student "${targetStudent.name}" (${studentId})`);
        io.to(targetStudent.socketId).emit("teacher-edited-code", {
          code,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 12. Code Execution Socket Event with stdin support
    socket.on("run-code", async ({ roomId, code, stdin }: { roomId: string; code: string; stdin?: string }, callback) => {
      const cleanRoomId = (roomId || "").toUpperCase();
      console.log(`[Run Code] Code execution requested for room ${cleanRoomId} (stdin length: ${(stdin || "").length})`);

      const result = await executePythonCode(code, stdin || "");

      const executionPayload = {
        roomId: cleanRoomId,
        ...result,
        timestamp: new Date().toISOString(),
      };

      // Broadcast execution result to all connected clients in the room (teacher & students)
      if (cleanRoomId && cleanRoomId !== "") {
        io.to(cleanRoomId).emit("execution-result", executionPayload);
      }

      if (typeof callback === "function") {
        callback(executionPayload);
      }
    });

    // 13. End Room Event (Purges memory & notifies everyone)
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

    // 14. Handle Disconnection & Memory Cleanup
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
              raisedHands: room.raisedHands,
              activeSpeakerId: room.activeSpeakerId,
            });
          }
        }
      }
    });
  });
};
