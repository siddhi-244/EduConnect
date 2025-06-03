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
  startTime: Timestamp;
  endTime: Timestamp;
  isBooked: boolean;
  bookedByStudentId?: string;
  studentName?: string; // Denormalized for easier display
  studentEmail?: string; // Denormalized for notifications
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'confirmed' | 'cancelled_by_student' | 'cancelled_by_teacher';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Teacher {
  uid: string;
  displayName: string;
  email: string;
  // Add any other teacher-specific fields, e.g., subjects, bio
}
