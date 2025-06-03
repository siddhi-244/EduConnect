"use client";

import { useAuth } from "@/hooks/use-auth-hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, CheckCircle, Loader2, XCircle, CalendarDays, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { AvailabilitySlot, Teacher, UserProfile } from "@/types";
import { getAvailableTeachers, getTeacherAvailabilityForDate, bookSlot } from "@/app/actions/booking.actions";
import { format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FindTeacherPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    async function fetchTeachers() {
      setIsLoadingTeachers(true);
      try {
        const fetchedTeachers = await getAvailableTeachers();
        setTeachers(fetchedTeachers);
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch teachers." });
      } finally {
        setIsLoadingTeachers(false);
      }
    }
    if (userProfile?.role === 'student') {
      fetchTeachers();
    }
  }, [userProfile, toast]);

  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedTeacher || !selectedDate) {
        setAvailability([]);
        return;
      }
      setIsLoadingAvailability(true);
      try {
        const slots = await getTeacherAvailabilityForDate(selectedTeacher.uid, selectedDate);
        setAvailability(slots.filter(slot => !slot.isBooked)); // Only show non-booked slots
      } catch (error) {
        console.error("Failed to fetch availability:", error);
        toast({ variant: "destructive", title: "Error", description: `Could not fetch availability for ${selectedTeacher.displayName}.` });
        setAvailability([]);
      } finally {
        setIsLoadingAvailability(false);
      }
    }
    fetchAvailability();
  }, [selectedTeacher, selectedDate, toast]);

  const handleBookSlot = async (slot: AvailabilitySlot) => {
    if (!userProfile || !selectedTeacher) return;
    setIsBooking(true);
    try {
      await bookSlot({
        studentId: userProfile.uid,
        studentName: userProfile.displayName || "Student",
        studentEmail: userProfile.email || "student@example.com",
        teacherId: selectedTeacher.uid,
        teacherName: selectedTeacher.displayName,
        teacherEmail: selectedTeacher.email,
        availabilitySlotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      toast({ title: "Success!", description: `Session with ${selectedTeacher.displayName} booked.` });
      // Refetch availability for the current teacher and date
      if (selectedTeacher && selectedDate) {
        const slots = await getTeacherAvailabilityForDate(selectedTeacher.uid, selectedDate);
        setAvailability(slots.filter(s => !s.isBooked));
      }
    } catch (error: any) {
      console.error("Booking failed:", error);
      toast({ variant: "destructive", title: "Booking Failed", description: error.message || "Could not book the session." });
    } finally {
      setIsBooking(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (userProfile?.role !== 'student') {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="font-headline">Access Denied</AlertTitle>
        <AlertDescription className="font-body">This page is only accessible to students.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-3 h-7 w-7 text-primary" /> Find a Teacher & Book Session
          </CardTitle>
          <CardDescription className="font-body">
            Select a teacher and a date to see their available time slots.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline text-lg">1. Select Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTeachers ? (
              <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading teachers...</div>
            ) : teachers.length === 0 ? (
              <Alert>
                <Search className="h-4 w-4"/>
                <AlertTitle className="font-headline">No Teachers Found</AlertTitle>
                <AlertDescription className="font-body">There are currently no teachers available.</AlertDescription>
              </Alert>
            ) : (
              <Select
                onValueChange={(value) => {
                  const teacher = teachers.find(t => t.uid === value);
                  setSelectedTeacher(teacher || null);
                }}
                value={selectedTeacher?.uid}
              >
                <SelectTrigger className="w-full font-body">
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.uid} value={teacher.uid} className="font-body">
                      {teacher.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline text-lg">2. Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border p-0"
              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || !selectedTeacher} // Disable past dates & if no teacher
            />
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline text-lg">3. Available Slots</CardTitle>
            {selectedTeacher && selectedDate && (
                <CardDescription className="font-body text-sm">
                    Showing slots for {selectedTeacher.displayName} on {format(selectedDate, "PPP")}
                </CardDescription>
            )}
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {!selectedTeacher || !selectedDate ? (
                <Alert variant="default" className="bg-muted/30">
                    <CalendarDays className="h-4 w-4"/>
                    <AlertTitle className="font-headline">Select Teacher & Date</AlertTitle>
                    <AlertDescription className="font-body">Please select a teacher and a date to view available slots.</AlertDescription>
                </Alert>
            ): isLoadingAvailability ? (
              <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading availability...</div>
            ) : availability.length === 0 ? (
              <Alert>
                <CalendarDays className="h-4 w-4"/>
                <AlertTitle className="font-headline">No Slots Available</AlertTitle>
                <AlertDescription className="font-body">
                  {selectedTeacher?.displayName} has no available slots on this date. Please try another date or teacher.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {availability.map(slot => (
                  <Button
                    key={slot.id}
                    variant="outline"
                    className="w-full justify-start font-body"
                    onClick={() => handleBookSlot(slot)}
                    disabled={isBooking}
                  >
                    {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
                    {format(slot.startTime.toDate(), "p")} - {format(slot.endTime.toDate(), "p")}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
