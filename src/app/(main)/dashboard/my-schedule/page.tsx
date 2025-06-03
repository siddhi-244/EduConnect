
"use client";

import { useAuth } from "@/hooks/use-auth-hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpenCheck, CalendarX2, History, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Booking } from "@/types";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

export default function MySchedulePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (authLoading) {
      console.log("MySchedulePage: Auth still loading, returning early.");
      return;
    }
    if (!userProfile || !userProfile.uid) {
        console.log("MySchedulePage: No user profile or UID, setting loadingBookings to false and returning early.");
        setLoadingBookings(false);
        return;
    }

    console.log(`MySchedulePage: Auth loaded. Setting up listener for user ${userProfile.uid}, role ${userProfile.role}`);
    setLoadingBookings(true);
    const fieldToQuery = userProfile.role === 'teacher' ? 'teacherId' : 'studentId';
    console.log(`MySchedulePage: Querying on field '${fieldToQuery}' with value '${userProfile.uid}' for confirmed bookings.`);

    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where(fieldToQuery, "==", userProfile.uid),
      where("status", "==", "confirmed"),
      orderBy("startTime", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(`MySchedulePage: onSnapshot triggered. querySnapshot.empty: ${querySnapshot.empty}, querySnapshot.size: ${querySnapshot.size}`);
      const now = new Date();
      const upcoming: Booking[] = [];
      const past: Booking[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Log a serializable version of data for easier inspection
        console.log(`MySchedulePage: Processing doc ${doc.id}, raw data:`, JSON.parse(JSON.stringify(data)));

        const docStartTime = data.startTime;
        const docEndTime = data.endTime;
        const docCreatedAt = data.createdAt;
        const docUpdatedAt = data.updatedAt;

        // Check if fields are Firestore Timestamps before converting
        // Note: `data.startTime` from Firestore should be a Timestamp if stored correctly.
        // The Booking type expects ISO strings, so conversion is needed.
        if (
          !(docStartTime instanceof Timestamp) ||
          !(docEndTime instanceof Timestamp) ||
          !(docCreatedAt instanceof Timestamp) ||
          !(docUpdatedAt instanceof Timestamp)
        ) {
          console.warn(`MySchedulePage: Booking ${doc.id} has one or more date fields that are not Firestore Timestamps. Skipping. StartTime type: ${typeof docStartTime}, Is Timestamp: ${docStartTime instanceof Timestamp}. Data:`, data);
          return;
        }

        const serializableBooking: Booking = {
            id: doc.id,
            studentId: data.studentId,
            studentName: data.studentName,
            studentEmail: data.studentEmail,
            teacherId: data.teacherId,
            teacherName: data.teacherName,
            teacherEmail: data.teacherEmail,
            availabilitySlotId: data.availabilitySlotId,
            status: data.status,
            startTime: (docStartTime as Timestamp).toDate().toISOString(),
            endTime: (docEndTime as Timestamp).toDate().toISOString(),
            createdAt: (docCreatedAt as Timestamp).toDate().toISOString(),
            updatedAt: (docUpdatedAt as Timestamp).toDate().toISOString(),
        };
        console.log(`MySchedulePage: Doc ${doc.id} - Mapped to serializableBooking. StartTime: ${serializableBooking.startTime}`);

        const startTimeDate = new Date(serializableBooking.startTime);
        console.log(`MySchedulePage: Doc ${doc.id} - Converted startTimeDate: ${startTimeDate.toISOString()}, Now: ${now.toISOString()}`);

        if (startTimeDate > now) {
          console.log(`MySchedulePage: Doc ${doc.id} (${serializableBooking.teacherName}/${serializableBooking.studentName}) categorized as UPCOMING.`);
          upcoming.push(serializableBooking);
        } else {
          console.log(`MySchedulePage: Doc ${doc.id} (${serializableBooking.teacherName}/${serializableBooking.studentName}) categorized as PAST.`);
          past.push(serializableBooking);
        }
      });

      console.log(`MySchedulePage: Finished processing snapshot. Final upcoming count: ${upcoming.length}, past count: ${past.length}`);
      setUpcomingBookings(upcoming);
      setPastBookings(past.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
      setLoadingBookings(false);
    }, (error) => {
      console.error("MySchedulePage: Error fetching bookings:", error);
      // Consider adding a user-facing error message here, e.g., using a toast notification.
      setLoadingBookings(false);
    });

    return () => {
      console.log("MySchedulePage: Unsubscribing from bookings listener.");
      unsubscribe();
    };

  }, [userProfile, authLoading]); // Added authLoading to ensure effect runs after auth state is resolved.

  if (authLoading || loadingBookings) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const renderBookingCard = (booking: Booking) => {
    const isTeacher = userProfile?.role === 'teacher';
    const otherPartyName = isTeacher ? booking.studentName : booking.teacherName;
    const otherPartyRole = isTeacher ? 'Student' : 'Teacher';

    // Ensure booking.startTime and booking.endTime are valid date strings before parsing
    let startTimeDate, endTimeDate;
    try {
        startTimeDate = new Date(booking.startTime);
        endTimeDate = new Date(booking.endTime);
        if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
            console.error(`Invalid date string for booking ${booking.id}. Start: ${booking.startTime}, End: ${booking.endTime}`);
            return <Card key={booking.id} className="shadow-md border-red-500"><CardHeader><CardTitle>Error: Invalid Date</CardTitle></CardHeader><CardContent>Could not display booking due to invalid date format.</CardContent></Card>;
        }
    } catch (e) {
        console.error(`Error parsing date for booking ${booking.id}:`, e);
        return <Card key={booking.id} className="shadow-md border-red-500"><CardHeader><CardTitle>Error: Date Parsing Failed</CardTitle></CardHeader><CardContent>Could not display booking due to date parsing error.</CardContent></Card>;
    }


    return (
      <Card key={booking.id} className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="font-headline text-lg">Session with {otherPartyName || 'N/A'}</CardTitle>
          <CardDescription className="font-body text-sm">
            Role: {otherPartyRole}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-body">
          <p><strong>Date:</strong> {format(startTimeDate, "PPP")}</p>
          <p><strong>Time:</strong> {format(startTimeDate, "p")} - {format(endTimeDate, "p")}</p>
          <p className="text-xs text-muted-foreground">Booked on: {booking.createdAt ? format(new Date(booking.createdAt), "PPp") : 'N/A'}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookOpenCheck className="mr-3 h-7 w-7 text-primary" /> My Schedule
          </CardTitle>
          <CardDescription className="font-body">
            View your upcoming and past scheduled sessions.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="font-body">
            <CalendarClock className="mr-2 h-4 w-4" /> Upcoming Sessions ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="font-body">
            <History className="mr-2 h-4 w-4" /> Past Sessions ({pastBookings.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcomingBookings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBookings.map(renderBookingCard)}
            </div>
          ) : (
            <Alert>
              <CalendarX2 className="h-4 w-4" />
              <AlertTitle className="font-headline">No Upcoming Sessions</AlertTitle>
              <AlertDescription className="font-body">
                You have no sessions scheduled. {userProfile?.role === 'student' ? "Find a teacher to book a new session." : "Manage your availability to get bookings."}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="past">
          {pastBookings.length > 0 ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastBookings.map(renderBookingCard)}
            </div>
          ) : (
            <Alert>
              <CalendarX2 className="h-4 w-4" />
              <AlertTitle className="font-headline">No Past Sessions</AlertTitle>
              <AlertDescription className="font-body">You have no completed or past sessions recorded.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Using an inline SVG for CalendarClock to avoid potential import issues if not already available
const CalendarClock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/>
    <path d="M16 2v4"/>
    <path d="M8 2v4"/>
    <path d="M3 10h18"/>
    <path d="M18 18.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z"/>
    <path d="M18 16.5v-3.5L16.5 18"/>
  </svg>
);
