"use server";

import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types";

// This action can be used to ensure user profile exists or update it,
// especially after social sign-in or if role needs to be set post-creation.
export async function ensureUserProfile(
  uid: string, 
  email: string | null, 
  displayName: string | null, 
  photoURL?: string | null,
  role?: 'student' | 'teacher' | null // Optional role if not set during initial auth
): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const existingProfile = docSnap.data() as UserProfile;
    // If role is passed and current role is null, update it.
    if (role && existingProfile.role === null) {
      const updatedData: Partial<UserProfile> = { role };
      if (displayName && !existingProfile.displayName) updatedData.displayName = displayName;
      if (photoURL && !existingProfile.photoURL) updatedData.photoURL = photoURL;
      
      await setDoc(userRef, updatedData, { merge: true });
      return { ...existingProfile, ...updatedData };
    }
    return existingProfile;
  } else {
    const newProfile: UserProfile = {
      uid,
      email,
      displayName,
      role: role || null, // Set role if provided, otherwise null
      photoURL: photoURL || null,
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
}

// Note: Firebase sign-out is typically client-side using `signOut(auth)`.
// A server action for logout might be used if you manage custom session tokens,
// but for Firebase client SDK auth, it's not standard.

// Example: if you needed to perform server-side cleanup on logout
export async function handleUserLogout(userId: string): Promise<void> {
  console.log(`User ${userId} logged out. Perform any server-side cleanup if necessary.`);
  // e.g., invalidate a custom session token, log audit event, etc.
}
