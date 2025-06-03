
"use server";

import { collection, query, where, getDocs, Timestamp, orderBy, doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvailabilitySlot, Teacher, Booking, UserProfile } from "@/types";

export async function getAvailableTeachers(): Promise<Teacher[]> {
  const usersCollectionRef = collection(db, "users");
  const q = query(usersCollectionRef, where("role", "==", "teacher"));
  
  const querySnapshot = await getDocs(q);
  const teachers: Teacher[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as UserProfile;
    if (data.displayName && data.email) { 
        teachers.push({ 
            uid: doc.id, 
            displayName: data.displayName,
            email: data.email,
        });
    }
  });
  return teachers;
}

export async function getTeacherAvailabilityForDate(teacherId: string, date: Date): Promise<AvailabilitySlot[]> {
  if (!teacherId) throw new Error("Teacher ID is required.");
  if (!date) throw new Error("Date is required.");

  const startOfDay = Timestamp.fromDate(new Date(date.setHours(0, 0, 0, 0)));
  const endOfDay = Timestamp.fromDate(new Date(date.setHours(23, 59, 59, 999)));

  const availabilityCollectionRef = collection(db, "availabilities");
  const q = query(
    availabilityCollectionRef,
    where("teacherId", "==", teacherId),
    where("startTime", ">=", startOfDay),
    where("startTime", "<=", endOfDay),
    orderBy("startTime", "asc")
  );

  const querySnapshot = await getDocs(q);
  const slots: AvailabilitySlot[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    slots.push({ 
      id: doc.id,
      teacherId: data.teacherId,
      startTime: (data.startTime as Timestamp).toDate().toISOString(),
      endTime: (data.endTime as Timestamp).toDate().toISOString(),
      isBooked: data.isBooked,
      bookedByStudentId: data.bookedByStudentId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
     } as AvailabilitySlot);
  });
  return slots;
}

interface BookSlotParams {
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  availabilitySlotId: string;
  startTime: Timestamp; // Client will send Timestamp
  endTime: Timestamp;   // Client will send Timestamp
}

export async function bookSlot(params: BookSlotParams): Promise<string> {
  const {
    studentId, studentName, studentEmail,
    teacherId, teacherName, teacherEmail,
    availabilitySlotId, startTime, endTime,
  } = params;

  if (!studentId || !teacherId || !availabilitySlotId) {
    throw new Error("Missing required parameters for booking.");
  }

  const availabilitySlotRef = doc(db, "availabilities", availabilitySlotId);
  const newBookingRef = doc(collection(db, "bookings")); 

  try {
    await runTransaction(db, async (transaction) => {
      const slotDoc = await transaction.get(availabilitySlotRef);
      if (!slotDoc.exists()) {
        throw new Error("Availability slot not found.");
      }

      const slotData = slotDoc.data() as AvailabilitySlot & { startTime: Timestamp, endTime: Timestamp }; // Internally it is timestamp
      if (slotData.isBooked) {
        throw new Error("This time slot is no longer available.");
      }
      if (slotData.teacherId !== teacherId) {
        throw new Error("Slot does not belong to the selected teacher.");
      }

      transaction.update(availabilitySlotRef, {
        isBooked: true,
        bookedByStudentId: studentId,
        studentName: studentName, 
        studentEmail: studentEmail, 
        updatedAt: serverTimestamp(),
      });

      const newBookingData = { // Type Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'startTime' | 'endTime'> & {startTime: Timestamp, endTime: Timestamp} doesn't quite work with serverTimestamp
        studentId,
        studentName,
        studentEmail,
        teacherId,
        teacherName,
        teacherEmail,
        availabilitySlotId,
        startTime, // This is already a Timestamp from params
        endTime,   // This is already a Timestamp from params
        status: "confirmed",
      };
      transaction.set(newBookingRef, {
        ...newBookingData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await sendBookingConfirmationEmail({
      studentEmail, studentName,
      teacherEmail, teacherName,
      startTime: startTime.toDate(), // Convert Timestamp to Date for email
    });

    return newBookingRef.id; 
  } catch (error: any) {
    console.error("Booking transaction failed: ", error);
    throw new Error(error.message || "Failed to book the slot due to a server error.");
  }
}

async function sendBookingConfirmationEmail(details: {
  studentEmail: string; studentName: string;
  teacherEmail: string; teacherName: string;
  startTime: Date;
}) {
  console.log(`Simulating email sending for booking:
    To Student (${details.studentEmail}): Your session with ${details.teacherName} at ${details.startTime.toLocaleString()} is confirmed.
    To Teacher (${details.teacherEmail}): You have a new session with ${details.studentName} at ${details.startTime.toLocaleString()}.
  `);
  return Promise.resolve();
}
