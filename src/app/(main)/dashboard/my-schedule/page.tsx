
"use client";

import { useAuth } from "@/hooks/use-auth-hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpenCheck, CalendarX2, History, Loader2 } from "lucide-react";
// Button component is not directly used, can be removed if not needed for future actions
// import { Button } from "@/components/ui/button"; 
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
    if (!userProfile || !userProfile.uid) {
        setLoadingBookings(false); // Ensure loading state is cleared if no user
        return;
    }

    setLoadingBookings(true);
    const fieldToQuery = userProfile.role === 'teacher' ? 'teacherId' : 'studentId';
    
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef, 
      where(fieldToQuery, "==", userProfile.uid),
      where("status", "==", "confirmed"), 
      orderBy("startTime", "asc") // Firestore Timestamps are used for orderBy
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const nowServerTimestamp = Timestamp.now(); // Use server timestamp for comparison
      const upcoming: Booking[] = [];
      const past: Booking[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const bookingFirebase = { 
            id: doc.id, 
            ...data 
        } as Omit<Booking, 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'> & {
            startTime: Timestamp;
            endTime: Timestamp;
            createdAt: Timestamp;
            updatedAt: Timestamp;
        };

        // Convert Timestamps to ISO strings for client-side state
        const serializableBooking: Booking = {
            ...bookingFirebase,
            startTime: bookingFirebase.startTime.toDate().toISOString(),
            endTime: bookingFirebase.endTime.toDate().toISOString(),
            createdAt: bookingFirebase.createdAt.toDate().toISOString(),
            updatedAt: bookingFirebase.updatedAt.toDate().toISOString(),
        };

        if (bookingFirebase.startTime.seconds > nowServerTimestamp.seconds) {
          upcoming.push(serializableBooking);
        } else {
          past.push(serializableBooking);
        }
      });
      setUpcomingBookings(upcoming); // Already sorted by query
      setPastBookings(past.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())); // Sort past descending by date
      setLoadingBookings(false);
    }, (error) => {
      console.error("Error fetching bookings:", error);
      setLoadingBookings(false);
      // Add toast notification for error
    });

    return () => unsubscribe();

  }, [userProfile]);

  if (authLoading || loadingBookings) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const renderBookingCard = (booking: Booking) => {
    const isTeacher = userProfile?.role === 'teacher';
    const otherPartyName = isTeacher ? booking.studentName : booking.teacherName;
    const otherPartyRole = isTeacher ? 'Student' : 'Teacher';

    // Convert ISO strings back to Date objects for formatting
    const startTimeDate = new Date(booking.startTime);
    const endTimeDate = new Date(booking.endTime);

    return (
      <Card key={booking.id} className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="font-headline text-lg">Session with {otherPartyName}</CardTitle>
          <CardDescription className="font-body text-sm">
            Role: {otherPartyRole}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-body">
          <p><strong>Date:</strong> {format(startTimeDate, "PPP")}</p>
          <p><strong>Time:</strong> {format(startTimeDate, "p")} - {format(endTimeDate, "p")}</p>
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