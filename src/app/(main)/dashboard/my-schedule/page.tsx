
"use client";

import { useAuth } from "@/hooks/use-auth-hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"; // Added CardFooter
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpenCheck, CalendarX2, History, Loader2, Link as LinkIcon, MessageSquareWarning, Ban } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { Booking } from "@/types";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isFuture, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cancelBookingByTeacher } from "@/app/actions/booking.actions";
import Link from "next/link";

export default function MySchedulePage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

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
    
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where(fieldToQuery, "==", userProfile.uid),
      orderBy("startTime", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(`MySchedulePage: onSnapshot triggered. querySnapshot.empty: ${querySnapshot.empty}, querySnapshot.size: ${querySnapshot.size}`);
      const now = new Date();
      const upcoming: Booking[] = [];
      const past: Booking[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`MySchedulePage: Processing doc ${doc.id}, raw data:`, JSON.parse(JSON.stringify(data)));

        const docStartTime = data.startTime;
        const docEndTime = data.endTime;
        const docCreatedAt = data.createdAt;
        const docUpdatedAt = data.updatedAt;

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
            cancellationReason: data.cancellationReason,
            cancelledBy: data.cancelledBy,
            googleMeetLink: data.googleMeetLink,
        };
        
        const startTimeDate = new Date(serializableBooking.startTime);

        if (isFuture(startTimeDate) || (serializableBooking.status === 'confirmed' && !isPast(startTimeDate))) { 
          upcoming.push(serializableBooking);
        } else {
          past.push(serializableBooking);
        }
      });

      setUpcomingBookings(upcoming); 
      setPastBookings(past.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
      setLoadingBookings(false);
    }, (error) => {
      console.error("MySchedulePage: Error fetching bookings:", error);
      setLoadingBookings(false);
    });

    return () => {
      console.log("MySchedulePage: Unsubscribing from bookings listener.");
      unsubscribe();
    };

  }, [userProfile, authLoading]);

  const handleOpenCancelDialog = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancellationReason("");
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancellation = async () => {
    if (!bookingToCancel || !cancellationReason.trim() || !userProfile) return;
    setIsCancelling(true);
    try {
      await cancelBookingByTeacher(bookingToCancel.id, cancellationReason.trim(), userProfile.uid);
      toast({ title: "Booking Cancelled", description: "The booking has been successfully cancelled." });
      setIsCancelDialogOpen(false);
      setBookingToCancel(null);
      // The onSnapshot listener should automatically update the lists.
    } catch (error: any) {
      toast({ variant: "destructive", title: "Cancellation Failed", description: error.message });
    } finally {
      setIsCancelling(false);
    }
  };

  if (authLoading || loadingBookings) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!userProfile) {
    return <div className="text-center py-10">Please log in to view your schedule.</div>;
  }

  const renderBookingCard = (booking: Booking, _isUpcoming: boolean) => { // _isUpcoming can be used if specific logic is needed for it later
    const isTeacherView = userProfile.role === 'teacher';
    const otherPartyName = isTeacherView ? booking.studentName : booking.teacherName;
    const otherPartyRole = isTeacherView ? 'Student' : 'Teacher';

    let startTimeDate, endTimeDate, createdAtDate;
    try {
        startTimeDate = new Date(booking.startTime);
        endTimeDate = new Date(booking.endTime);
        createdAtDate = new Date(booking.createdAt);
        if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime()) || isNaN(createdAtDate.getTime())) {
            console.error(`Invalid date string for booking ${booking.id}. Start: ${booking.startTime}, End: ${booking.endTime}, Created: ${booking.createdAt}`);
            return <Card key={booking.id} className="shadow-md border-red-500"><CardHeader><CardTitle>Error: Invalid Date</CardTitle></CardHeader><CardContent>Could not display booking due to invalid date format.</CardContent></Card>;
        }
    } catch (e) {
        console.error(`Error parsing date for booking ${booking.id}:`, e);
        return <Card key={booking.id} className="shadow-md border-red-500"><CardHeader><CardTitle>Error: Date Parsing</CardTitle></CardHeader><CardContent>Could not display booking due to date parsing error.</CardContent></Card>;
    }
    
    const canCancel = isTeacherView && booking.status === 'confirmed' && isFuture(startTimeDate);

    return (
      <Card key={booking.id} className={`shadow-md hover:shadow-lg transition-shadow ${booking.status.startsWith('cancelled') ? 'opacity-70 bg-muted/50' : ''}`}>
        <CardHeader>
          <CardTitle className="font-headline text-lg flex justify-between items-start">
            <span>Session with {otherPartyName || 'N/A'}</span>
            {booking.status === 'confirmed' && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-body">Confirmed</span>}
            {booking.status === 'cancelled_by_teacher' && <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-body">Cancelled by Teacher</span>}
            {booking.status === 'cancelled_by_student' && <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-body">Cancelled by Student</span>}
          </CardTitle>
          <CardDescription className="font-body text-sm">
            Role: {otherPartyRole}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-body">
          <p><strong>Date:</strong> {format(startTimeDate, "PPP")}</p>
          <p><strong>Time:</strong> {format(startTimeDate, "p")} - {format(endTimeDate, "p")}</p>
          
          {booking.status === 'confirmed' && booking.googleMeetLink && isFuture(startTimeDate) && (
            <p className="flex items-center">
              <LinkIcon className="mr-2 h-4 w-4 text-blue-500"/> 
              <strong>Meet Link:</strong>&nbsp;
              <Link href={booking.googleMeetLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                {booking.googleMeetLink}
              </Link>
            </p>
          )}

          {booking.status.startsWith('cancelled') && booking.cancellationReason && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-semibold text-yellow-700 flex items-center">
                    <MessageSquareWarning className="h-4 w-4 mr-1.5"/> Cancellation Reason:
                </p>
                <p className="text-xs text-yellow-600 pl-1">{booking.cancellationReason}</p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">Booked on: {format(createdAtDate, "PPp")}</p>
        </CardContent>
        {canCancel && (
          <CardFooter>
            <Button variant="destructive" size="sm" onClick={() => handleOpenCancelDialog(booking)} className="w-full font-body">
              <Ban className="mr-2 h-4 w-4" /> Cancel Booking
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };
  
  const activeUpcomingBookings = upcomingBookings.filter(b => b.status === 'confirmed' && isFuture(new Date(b.startTime)));
  const otherUpcomingBookings = upcomingBookings.filter(b => !(b.status === 'confirmed' && isFuture(new Date(b.startTime))));


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
            <CalendarClock className="mr-2 h-4 w-4" /> Upcoming Sessions ({activeUpcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="font-body">
            <History className="mr-2 h-4 w-4" /> Past & Cancelled Sessions ({pastBookings.length + otherUpcomingBookings.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {activeUpcomingBookings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeUpcomingBookings.map(booking => renderBookingCard(booking, true))}
            </div>
          ) : (
            <Alert>
              <CalendarX2 className="h-4 w-4" />
              <AlertTitle className="font-headline">No Upcoming Confirmed Sessions</AlertTitle>
              <AlertDescription className="font-body">
                You have no active sessions scheduled. {userProfile?.role === 'student' ? "Find a teacher to book a new session." : "Manage your availability to get bookings."}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="past">
          {(pastBookings.length + otherUpcomingBookings.length) > 0 ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Show other upcoming (cancelled) then past */}
              {otherUpcomingBookings.sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(booking => renderBookingCard(booking, false))}
              {pastBookings.map(booking => renderBookingCard(booking, false))}
            </div>
          ) : (
            <Alert>
              <CalendarX2 className="h-4 w-4" />
              <AlertTitle className="font-headline">No Past or Cancelled Sessions</AlertTitle>
              <AlertDescription className="font-body">You have no completed or cancelled sessions recorded.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline">Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Please provide a reason for cancelling this booking. The {userProfile?.role === 'teacher' ? 'student' : 'teacher'} will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Enter cancellation reason..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={3}
              className="font-body"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Close</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancellation} 
              disabled={!cancellationReason.trim() || isCancelling}
              className="bg-destructive hover:bg-destructive/90 font-body"
            >
              {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4"/>}
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Custom CalendarClock icon as lucide-react might not have this specific composite
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

    