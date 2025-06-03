"use server";

import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvailabilitySlot } from "@/types";

interface NewAvailabilitySlotData {
  startTime: Timestamp;
  endTime: Timestamp;
}

export async function addAvailability(teacherId: string, slots: NewAvailabilitySlotData[]): Promise<void> {
  if (!teacherId) {
    throw new Error("Teacher ID is required.");
  }
  if (!slots || slots.length === 0) {
    throw new Error("At least one slot is required.");
  }

  const availabilityCollectionRef = collection(db, "availabilities");
  const batch = writeBatch(db);

  for (const slot of slots) {
    if (slot.startTime >= slot.endTime) {
      throw new Error(`Invalid time range: Start time ${slot.startTime.toDate().toISOString()} must be before end time ${slot.endTime.toDate().toISOString()}.`);
    }
    // Optional: Add check for overlapping slots before saving, though can be complex.
    // For now, we assume slots are distinct or frontend handles some validation.

    const newSlotDoc = doc(collection(db, "availabilities")); // Auto-generate ID
    batch.set(newSlotDoc, {
      teacherId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBooked: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  
  await batch.commit();
}

export async function getTeacherAvailability(teacherId: string): Promise<AvailabilitySlot[]> {
  if (!teacherId) {
    throw new Error("Teacher ID is required.");
  }
  const availabilityCollectionRef = collection(db, "availabilities");
  const q = query(
    availabilityCollectionRef, 
    where("teacherId", "==", teacherId),
    orderBy("startTime", "asc") // Good for displaying chronologically
  );

  const querySnapshot = await getDocs(q);
  const slots: AvailabilitySlot[] = [];
  querySnapshot.forEach((doc) => {
    slots.push({ id: doc.id, ...doc.data() } as AvailabilitySlot);
  });
  return slots;
}

export async function deleteAvailabilitySlot(slotId: string): Promise<void> {
  if (!slotId) {
    throw new Error("Slot ID is required.");
  }
  // Potentially add a check: only delete if not booked, or handle booked slots differently.
  // For now, direct delete.
  const slotDocRef = doc(db, "availabilities", slotId);
  await deleteDoc(slotDocRef);
}
