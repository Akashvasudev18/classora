export interface Student {
  id: string;
  name: string;
  socketId: string;
  practiceCode?: string;
  practiceResult?: any;
}

export interface PracticeProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedTime: string;
  description: string;
  starterCode: string;
  exampleInput?: string;
  exampleOutput?: string;
}

export interface Room {
  teacherSocket: string;
  students: Student[];
  pendingStudents: Student[];
  editorContent: string;
  activePractice: PracticeProblem | null;
  raisedHands: string[]; // List of student IDs who raised their hand
  activeSpeakerId: string | null; // Currently approved student speaker ID (Max 1)
}

export class RoomManager {
  private rooms: Record<string, Room> = {};

  // Create a new room with custom or generated ID
  public createRoom(roomId: string, teacherSocket: string = ""): Room {
    const room: Room = {
      teacherSocket,
      students: [],
      pendingStudents: [],
      editorContent: "# Welcome to Classora Live Python Classroom!\n# Teacher's live Python code will appear here in real-time.\n\ndef classora_session():\n    print('Learn Together. Live.')\n",
      activePractice: null,
      raisedHands: [],
      activeSpeakerId: null,
    };
    this.rooms[roomId] = room;
    return room;
  }

  // Get a room by ID
  public getRoom(roomId: string): Room | undefined {
    return this.rooms[roomId];
  }

  // Check if room exists
  public roomExists(roomId: string): boolean {
    return Boolean(this.rooms[roomId]);
  }

  // Update teacher socket ID for a room
  public setTeacherSocket(roomId: string, socketId: string): boolean {
    if (!this.rooms[roomId]) return false;
    this.rooms[roomId].teacherSocket = socketId;
    return true;
  }

  // Add student to pending list
  public addPendingStudent(roomId: string, student: Student): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;

    // Avoid duplicate pending students by id or socketId
    const existingIndex = room.pendingStudents.findIndex(s => s.id === student.id || s.socketId === student.socketId);
    if (existingIndex !== -1) {
      room.pendingStudents[existingIndex] = student;
    } else {
      room.pendingStudents.push(student);
    }
    return true;
  }

  // Approve student (moves student from pending to active students array)
  public approveStudent(roomId: string, studentId: string): Student | null {
    const room = this.rooms[roomId];
    if (!room) return null;

    const index = room.pendingStudents.findIndex(s => s.id === studentId);
    if (index !== -1) {
      const [approvedStudent] = room.pendingStudents.splice(index, 1);
      // Remove any duplicate in active students list
      room.students = room.students.filter(s => s.id !== studentId);
      room.students.push(approvedStudent);
      return approvedStudent;
    }
    return null;
  }

  // Reject student from pending list
  public rejectStudent(roomId: string, studentId: string): Student | null {
    const room = this.rooms[roomId];
    if (!room) return null;

    const index = room.pendingStudents.findIndex(s => s.id === studentId);
    if (index !== -1) {
      const [rejectedStudent] = room.pendingStudents.splice(index, 1);
      return rejectedStudent;
    }
    return null;
  }

  // Update editor content
  public updateEditorContent(roomId: string, content: string): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;
    room.editorContent = content;
    return true;
  }

  // Update student practice code and terminal execution result in real time
  public updateStudentPracticeState(roomId: string, studentId: string, code: string, terminalResult?: any): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;

    const student = room.students.find(s => s.id === studentId || s.socketId === studentId);
    if (student) {
      student.practiceCode = code;
      if (terminalResult !== undefined) {
        student.practiceResult = terminalResult;
      }
      return true;
    }
    return false;
  }

  // Practice Session Management
  public startPracticeSession(roomId: string, practice: PracticeProblem): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;
    room.activePractice = practice;
    return true;
  }

  public endPracticeSession(roomId: string): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;
    room.activePractice = null;
    return true;
  }

  // Voice Permissions Management
  public raiseHand(roomId: string, studentId: string): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;

    if (!room.raisedHands.includes(studentId)) {
      room.raisedHands.push(studentId);
    }
    return true;
  }

  public lowerHand(roomId: string, studentId: string): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;

    room.raisedHands = room.raisedHands.filter(id => id !== studentId);
    return true;
  }

  public allowSpeaker(roomId: string, studentId: string): { success: boolean; previousSpeakerId: string | null } {
    const room = this.rooms[roomId];
    if (!room) return { success: false, previousSpeakerId: null };

    const previousSpeakerId = room.activeSpeakerId;
    room.activeSpeakerId = studentId;

    // Remove from raised hands queue
    room.raisedHands = room.raisedHands.filter(id => id !== studentId);

    return { success: true, previousSpeakerId };
  }

  public removeSpeaker(roomId: string, studentId: string): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;

    if (room.activeSpeakerId === studentId) {
      room.activeSpeakerId = null;
    }
    return true;
  }

  public muteAllStudents(roomId: string): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;

    room.activeSpeakerId = null;
    room.raisedHands = [];
    return true;
  }

  // Handle socket disconnection (cleans up pending & active students, or teacher)
  public handleDisconnect(socketId: string): { roomId: string; isTeacher: boolean; studentName?: string }[] {
    const affectedRooms: { roomId: string; isTeacher: boolean; studentName?: string }[] = [];

    for (const roomId of Object.keys(this.rooms)) {
      const room = this.rooms[roomId];

      if (room.teacherSocket === socketId) {
        affectedRooms.push({ roomId, isTeacher: true });
      }

      const activeIndex = room.students.findIndex(s => s.socketId === socketId);
      if (activeIndex !== -1) {
        const [student] = room.students.splice(activeIndex, 1);
        room.raisedHands = room.raisedHands.filter(id => id !== student.id);
        if (room.activeSpeakerId === student.id) {
          room.activeSpeakerId = null;
        }
        affectedRooms.push({ roomId, isTeacher: false, studentName: student.name });
      }

      const pendingIndex = room.pendingStudents.findIndex(s => s.socketId === socketId);
      if (pendingIndex !== -1) {
        const [student] = room.pendingStudents.splice(pendingIndex, 1);
        affectedRooms.push({ roomId, isTeacher: false, studentName: student.name });
      }
    }

    return affectedRooms;
  }

  // Delete room
  public deleteRoom(roomId: string): boolean {
    if (this.rooms[roomId]) {
      delete this.rooms[roomId];
      return true;
    }
    return false;
  }

  public getAllRooms(): Record<string, Room> {
    return this.rooms;
  }
}

export const roomManager = new RoomManager();
