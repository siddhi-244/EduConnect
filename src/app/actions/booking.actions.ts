
"use server";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  type DocumentReference,
  type FieldValue,
  Timestamp,
  type DocumentSnapshot // Added DocumentSnapshot import
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvailabilitySlot as ClientAvailabilitySlot, Teacher, Booking as ClientBooking, UserProfile } from "@/types";
import nodemailer from 'nodemailer';

// --- Firestore Document Specific Types ---
interface AvailabilitySlotDoc {
  teacherId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  isBooked: boolean;
  bookedByStudentId?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp | FieldValue;
}

interface BookingDoc {
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  availabilitySlotId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'confirmed' | 'cancelled_by_student' | 'cancelled_by_teacher' | 'completed';
  googleMeetLink?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  cancellationReason?: string;
  cancelledBy?: 'student' | 'teacher' | null;
}


// --- Server Actions ---

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

export async function getTeacherAvailabilityForDate(teacherId: string, date: Date): Promise<ClientAvailabilitySlot[]> {
  if (!teacherId) throw new Error("Teacher ID is required.");
  if (!date) throw new Error("Date is required.");

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const startOfDayTimestamp = Timestamp.fromDate(startOfDay);
  const endOfDayTimestamp = Timestamp.fromDate(endOfDay);

  const availabilityCollectionRef = collection(db, "availabilities");
  const q = query(
    availabilityCollectionRef,
    where("teacherId", "==", teacherId),
    where("startTime", ">=", startOfDayTimestamp),
    where("startTime", "<=", endOfDayTimestamp),
    // orderBy("startTime", "asc") // This was removed in a previous step but ideally should be here. Re-adding.
  );

  const querySnapshot = await getDocs(q);
  const slots: ClientAvailabilitySlot[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as AvailabilitySlotDoc; // Assuming AvailabilitySlotDoc has Timestamps
    slots.push({
      id: doc.id,
      teacherId: data.teacherId,
      startTime: data.startTime.toDate().toISOString(),
      endTime: data.endTime.toDate().toISOString(),
      isBooked: data.isBooked,
      bookedByStudentId: data.bookedByStudentId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      createdAt: (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()).toISOString(),
      updatedAt: (data.updatedAt instanceof Timestamp ? (data.updatedAt as Timestamp).toDate() : new Date()).toISOString(),
     } as ClientAvailabilitySlot);
  });
  // Sort in code as orderBy might not work with multiple inequality filters on different fields
  return slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

interface BookSlotParams {
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  availabilitySlotId: string;
  startTime: string; // Expect ISO String from client
  endTime: string;   // Expect ISO String from client
}

export async function bookSlot(params: BookSlotParams): Promise<string> {
  const {
    studentId, studentName, studentEmail,
    teacherId, teacherName, teacherEmail,
    availabilitySlotId,
    startTime: startTimeISO,
    endTime: endTimeISO,
  } = params;

  if (!studentId || !teacherId || !availabilitySlotId || !startTimeISO || !endTimeISO) {
    throw new Error("Missing required parameters for booking.");
  }

  const paramStartTime = Timestamp.fromDate(new Date(startTimeISO));
  const paramEndTime = Timestamp.fromDate(new Date(endTimeISO));

  const availabilitySlotRef = doc(db, "availabilities", availabilitySlotId) as DocumentReference<AvailabilitySlotDoc>;
  const newBookingRef = doc(collection(db, "bookings")) as DocumentReference<BookingDoc>;
  const googleMeetLink = `https://meet.google.com/fake-${newBookingRef.id}`;

  try {
    await runTransaction(db, async (transaction) => {
      const slotDoc = await transaction.get(availabilitySlotRef);
      if (!slotDoc.exists) { 
        throw new Error("Availability slot not found.");
      }

      const slotData = slotDoc.data();
      if (!slotData) {
        throw new Error("Availability slot data is missing.");
      }

      if (slotData.isBooked) {
        throw new Error("This time slot is no longer available.");
      }
      if (slotData.teacherId !== teacherId) {
        throw new Error("Slot does not belong to the selected teacher.");
      }

      const slotStartTimeFromDB = slotData.startTime;
      const slotEndTimeFromDB = slotData.endTime;

      if (!slotStartTimeFromDB.isEqual(paramStartTime) || !slotEndTimeFromDB.isEqual(paramEndTime)) {
        console.warn("Slot timing mismatch. Client sent:", {startTimeISO, endTimeISO}, "DB has:", {start: slotStartTimeFromDB.toDate(), end: slotEndTimeFromDB.toDate()});
        throw new Error("Slot timing mismatch. The slot details may have changed. Please refresh and try again.");
      }

      const updateSlotData: Partial<AvailabilitySlotDoc> = {
        isBooked: true,
        bookedByStudentId: studentId,
        studentName: studentName,
        studentEmail: studentEmail,
        updatedAt: serverTimestamp(),
      };
      transaction.update(availabilitySlotRef, updateSlotData);

      const newBookingData: BookingDoc = {
        studentId,
        studentName,
        studentEmail,
        teacherId,
        teacherName,
        teacherEmail,
        availabilitySlotId,
        startTime: paramStartTime,
        endTime: paramEndTime,
        status: "confirmed" as const,
        googleMeetLink,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      transaction.set(newBookingRef, newBookingData);
    });

    await sendBookingConfirmationEmail({
      studentEmail, studentName,
      teacherEmail, teacherName,
      startTime: new Date(startTimeISO), // Use the original ISO string to create date for email
      googleMeetLink,
    });

    return newBookingRef.id;
  } catch (error: any) {
    console.error("Booking transaction failed: ", error);
    throw new Error(error.message || "Failed to book the slot due to a server error.");
  }
}

export async function cancelBookingByTeacher(
  bookingId: string,
  reason: string,
  requestingTeacherId: string
): Promise<void> {
  if (!bookingId || !reason || !requestingTeacherId) {
    throw new Error("Missing required parameters for cancellation.");
  }

  const bookingRef = doc(db, "bookings", bookingId) as DocumentReference<BookingDoc>;
  let bookingDetailsForEmail: Partial<ClientBooking> = {}; // Use ClientBooking for email details

  try {
    await runTransaction(db, async (transaction) => {
      // --- START OF READ PHASE ---
      const bookingDocSnap = await transaction.get(bookingRef); // Read 1 (Booking)

      let availabilitySlotRef: DocumentReference<AvailabilitySlotDoc> | null = null;
      let slotDocSnap: DocumentSnapshot<AvailabilitySlotDoc> | null = null; // Corrected type

      if (!bookingDocSnap.exists) {
        throw new Error("Booking not found.");
      }
      const bookingData = bookingDocSnap.data(); // bookingData is BookingDoc
      if (!bookingData) throw new Error("Booking data is missing.");


      if (bookingData.availabilitySlotId) {
        availabilitySlotRef = doc(db, "availabilities", bookingData.availabilitySlotId) as DocumentReference<AvailabilitySlotDoc>;
        slotDocSnap = await transaction.get(availabilitySlotRef); // Read 2 (AvailabilitySlot) - Corrected type inference
        if (slotDocSnap && !slotDocSnap.exists) {
            console.warn(`Availability slot ${bookingData.availabilitySlotId} not found during cancellation for booking ${bookingId}. This might be okay if the slot was deleted manually, but the booking should still be cancellable.`);
        }
      }
      // --- END OF READ PHASE ---

      // --- START OF VALIDATION (using data from reads) ---
      const bookingStartTimeDate = bookingData.startTime.toDate(); // bookingData.startTime is Timestamp
      if (bookingData.teacherId !== requestingTeacherId) {
        throw new Error("You are not authorized to cancel this booking.");
      }
      if (bookingData.status !== "confirmed") {
        throw new Error("This booking is not in a 'confirmed' state and cannot be cancelled by you at this time.");
      }
      if (bookingStartTimeDate <= new Date()) {
        throw new Error("Cannot cancel a booking that has already started or is in the past.");
      }
      // --- END OF VALIDATION ---


      // --- START OF WRITE PHASE ---
      const updateBookingData: Partial<BookingDoc> = {
        status: "cancelled_by_teacher" as const,
        cancellationReason: reason,
        cancelledBy: "teacher" as const,
        updatedAt: serverTimestamp(),
      };
      transaction.update(bookingRef, updateBookingData); // Write 1 (Booking)

      if (availabilitySlotRef && slotDocSnap && slotDocSnap.exists()) {
        const updateSlotData: Partial<AvailabilitySlotDoc> = {
            isBooked: false,
            bookedByStudentId: null,
            studentName: null,
            studentEmail: null,
            updatedAt: serverTimestamp(),
        };
        transaction.update(availabilitySlotRef, updateSlotData); // Write 2 (AvailabilitySlot)
      }
      // --- END OF WRITE PHASE ---

      // Prepare data for email notification (using data already read and typed)
      bookingDetailsForEmail = {
        studentEmail: bookingData.studentEmail,
        studentName: bookingData.studentName,
        teacherName: bookingData.teacherName,
        teacherEmail: bookingData.teacherEmail,
        startTime: bookingData.startTime.toDate().toISOString(), // Convert to ISO string for ClientBooking type
      };
    });

    // Send email outside the transaction
    if (
        bookingDetailsForEmail.studentEmail &&
        bookingDetailsForEmail.studentName &&
        bookingDetailsForEmail.teacherName &&
        bookingDetailsForEmail.startTime // This is now an ISO string
    ) {
        await sendCancellationNotificationEmail({
            studentEmail: bookingDetailsForEmail.studentEmail,
            studentName: bookingDetailsForEmail.studentName,
            teacherName: bookingDetailsForEmail.teacherName,
            teacherEmail: bookingDetailsForEmail.teacherEmail, // Add this if needed by the email function
            cancelledBy: "teacher",
            reason: reason,
            sessionTime: new Date(bookingDetailsForEmail.startTime), // Convert ISO string back to Date
        });
    } else {
      console.warn(`Missing data in booking ${bookingId} for sending cancellation email. Details:`, bookingDetailsForEmail);
    }

  } catch (error: any) {
    console.error("Cancellation transaction failed for booking ID " + bookingId + ": ", error);
    throw new Error(error.message || "Failed to cancel the booking due to a server error.");
  }
}


// --- NODEMAILER SIMULATION ---
const createTransporter = () => {
  console.log("[Nodemailer Simulation] Transporter would be created here.");
  // In a real app, you'd configure this with actual SMTP details:
  // return nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: parseInt(process.env.SMTP_PORT || "587"),
  //   secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for other ports
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASS,
  //   },
  // });
  return {
    sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
      console.log("--- SIMULATING EMAIL SEND ---");
      console.log("To:", mailOptions.to);
      console.log("From:", mailOptions.from);
      console.log("Subject:", mailOptions.subject);
      console.log("HTML Body:", mailOptions.html);
      console.log("--- END OF EMAIL SIMULATION ---");
      return Promise.resolve({ messageId: `simulated-${Date.now()}` });
    }
  };
};


async function sendBookingConfirmationEmail(details: {
  studentEmail: string; studentName: string;
  teacherEmail: string; teacherName: string;
  startTime: Date; // Expect Date object
  googleMeetLink: string;
}) {
  const transporter = createTransporter();
  const formattedTime = details.startTime.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });

  const studentMailOptions: nodemailer.SendMailOptions = {
    from: '"EduConnect" <no-reply@connected.com>',
    to: details.studentEmail,
    subject: 'Your EduConnect Session is Confirmed!',
    html: `
      <p>Hi ${details.studentName},</p>
      <p>Your session with <strong>${details.teacherName}</strong> on <strong>${formattedTime}</strong> is confirmed.</p>
      <p>Join the session using this link: <a href="${details.googleMeetLink}">${details.googleMeetLink}</a></p>
      <p>We look forward to seeing you!</p>
      <p>The EduConnect Team</p>
    `,
  };

  const teacherMailOptions: nodemailer.SendMailOptions = {
    from: '"EduConnect" <no-reply@connected.com>',
    to: details.teacherEmail,
    subject: 'New Session Booked on EduConnect',
    html: `
      <p>Hi ${details.teacherName},</p>
      <p>A new session has been booked with <strong>${details.studentName}</strong> on <strong>${formattedTime}</strong>.</p>
      <p>Meeting Link: <a href="${details.googleMeetLink}">${details.googleMeetLink}</a></p>
      <p>Please ensure you are available at this time.</p>
      <p>The EduConnect Team</p>
    `,
  };

  try {
    await transporter.sendMail(studentMailOptions);
    await transporter.sendMail(teacherMailOptions);
    console.log("Booking confirmation emails simulated successfully.");
  } catch (error) {
    console.error("Error simulating booking confirmation emails:", error);
  }
}


async function sendCancellationNotificationEmail(details: {
  studentEmail: string;
  studentName: string;
  teacherName: string;
  teacherEmail?: string;
  cancelledBy: 'student' | 'teacher';
  reason: string;
  sessionTime: Date; // Expect Date object
}) {
  const transporter = createTransporter();
  const formattedTime = details.sessionTime.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
  const cancellerName = details.cancelledBy === 'teacher' ? details.teacherName : details.studentName;

  let recipientEmail: string;
  let recipientName: string;
  let otherPartyName: string;

  if (details.cancelledBy === 'teacher') {
    recipientEmail = details.studentEmail;
    recipientName = details.studentName;
    otherPartyName = details.teacherName;
  } else { // cancelled_by_student
    if (!details.teacherEmail) {
        console.warn("Teacher email not provided for student cancellation notification. Cannot send email to teacher.");
        return;
    }
    recipientEmail = details.teacherEmail;
    recipientName = details.teacherName;
    otherPartyName = details.studentName;
  }

  const mailOptionsToOtherParty: nodemailer.SendMailOptions = {
    from: '"EduConnect" <no-reply@connected.com>',
    to: recipientEmail,
    subject: 'EduConnect Session Cancelled',
    html: `
      <p>Hi ${recipientName},</p>
      <p>Your EduConnect session with <strong>${otherPartyName}</strong> scheduled for <strong>${formattedTime}</strong> has been cancelled by <strong>${cancellerName}</strong> (role: ${details.cancelledBy}).</p>
      <p><strong>Reason for cancellation:</strong> ${details.reason}</p>
      <p>We apologize for any inconvenience this may cause. Please feel free to schedule another session if needed.</p>
      <p>The EduConnect Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptionsToOtherParty);
    console.log(`Cancellation notification email simulated successfully to: ${recipientEmail}`);
  } catch (error) {
    console.error(`Error simulating cancellation notification email to ${recipientEmail}:`, error);
  }

  // Send a copy to the teacher if they cancelled
  if (details.cancelledBy === 'teacher' && details.teacherEmail) {
    const teacherSelfNotification: nodemailer.SendMailOptions = {
      from: '"EduConnect" <no-reply@connected.com>',
      to: details.teacherEmail,
      subject: 'Record: You Cancelled a EduConnect Session',
      html: `
        <p>Hi ${details.teacherName},</p>
        <p>This is a confirmation that you have cancelled your session with <strong>${details.studentName}</strong> (student email: ${details.studentEmail}) scheduled for <strong>${formattedTime}</strong>.</p>
        <p><strong>Reason given:</strong> ${details.reason}</p>
        <p>The student has been notified.</p>
        <p>The EduConnect Team</p>
      `,
    };
     try {
      await transporter.sendMail(teacherSelfNotification);
      console.log("Teacher self-notification for cancellation simulated successfully.");
    } catch (error) {
      console.error("Error simulating teacher self-notification for cancellation:", error);
    }
  }
}