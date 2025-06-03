
"use server";

import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, doc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvailabilitySlot } from "@/types";

interface NewAvailabilitySlotData {
  startTime: string; 
  endTime: string;   
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
  const uniqueSlotSignaturesInRequest = new Set<string>();

  for (const slot of slots) {
    const startDate = new Date(slot.startTime);
    const endDate = new Date(slot.endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`Invalid date string provided for slot: ${slot.startTime} or ${slot.endTime}`);
    }

    const tsStartTime = Timestamp.fromDate(startDate);
    const tsEndTime = Timestamp.fromDate(endDate);

    if (tsStartTime.toMillis() >= tsEndTime.toMillis()) {
      throw new Error(`Invalid time range: Start time ${startDate.toISOString()} must be before end time ${endDate.toISOString()}.`);
    }

    const requestSignature = `${tsStartTime.toMillis()}-${tsEndTime.toMillis()}`;
    if (uniqueSlotSignaturesInRequest.has(requestSignature)) {
      throw new Error(`Duplicate slot provided in this request: A slot from ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} on ${startDate.toLocaleDateString()} is listed multiple times.`);
    }
    uniqueSlotSignaturesInRequest.add(requestSignature);

    const duplicateCheckQuery = query(
      availabilityCollectionRef,
      where("teacherId", "==", teacherId),
      where("startTime", "==", tsStartTime),
      where("endTime", "==", tsEndTime)
    );
    const existingDuplicatesSnapshot = await getDocs(duplicateCheckQuery);
    if (!existingDuplicatesSnapshot.empty) {
      throw new Error(`Duplicate slot: A slot from ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} on ${startDate.toLocaleDateString()} already exists in your schedule.`);
    }
    
    const newSlotDoc = doc(availabilityCollectionRef); 
    batch.set(newSlotDoc, {
      teacherId,
      startTime: tsStartTime, 
      endTime: tsEndTime,     
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

export async function deleteAvailabilitySlot(slotId: string): Promise<void> {
  if (!slotId) {
    throw new Error("Slot ID is required.");
  }
  
  const slotDocRef = doc(db, "availabilities", slotId);
  const slotSnap = await getDoc(slotDocRef);

  if (!slotSnap.exists()) {
    throw new Error("Slot not found.");
  }
  if (slotSnap.data()?.isBooked) {
    throw new Error("Cannot delete a slot that is already booked.");
  }
  await deleteDoc(slotDocRef);
}