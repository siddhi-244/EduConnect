import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'student' | 'teacher' | null;
  photoURL?: string | null;
}

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  startTime: string; // Was Timestamp
  endTime: string;   // Was Timestamp
  isBooked: boolean;
  bookedByStudentId?: string;
  studentName?: string; 
  studentEmail?: string; 
  createdAt: string; // Was Timestamp
  updatedAt: string; // Was Timestamp
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  availabilitySlotId: string;
  startTime: string; // Was Timestamp
  endTime: string;   // Was Timestamp
  status: 'confirmed' | 'cancelled_by_student' | 'cancelled_by_teacher';
  createdAt: string; // Was Timestamp
  updatedAt: string; // Was Timestamp
}

export interface Teacher {
  uid: string;
  displayName: string;
  email: string;
}