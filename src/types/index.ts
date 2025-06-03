
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
  startTime: string; 
  endTime: string;   
  isBooked: boolean;
  bookedByStudentId?: string | null; // Allow null for when slot is freed
  studentName?: string | null; 
  studentEmail?: string | null; 
  createdAt: string; 
  updatedAt: string; 
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
  startTime: string; 
  endTime: string;   
  status: 'confirmed' | 'cancelled_by_student' | 'cancelled_by_teacher' | 'completed';
  createdAt: string; 
  updatedAt: string; 
  cancellationReason?: string;
  cancelledBy?: 'student' | 'teacher' | null;
  googleMeetLink?: string;
}

export interface Teacher {
  uid: string;
  displayName: string;
  email: string;
}
