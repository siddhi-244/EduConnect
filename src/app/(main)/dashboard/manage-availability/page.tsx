
"use client";

import { useAuth } from "@/hooks/use-auth-hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarPlus, CheckCircle, Loader2, PlusCircle, Trash2, XCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import { addAvailability, getTeacherAvailability, deleteAvailabilitySlot } from "@/app/actions/availability.actions";
import type { AvailabilitySlot } from "@/types";
// Timestamp is not needed here as we deal with strings/Dates on client
import { format, parse, setHours, setMinutes, setSeconds, setMilliseconds, isPast, addDays, isEqual, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface TimeSlot {
  id?: string; 
  date: Date;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export default function ManageAvailabilityPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [existingSlots, setExistingSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(true);

  useEffect(() => {
    if (userProfile?.role === 'teacher' && userProfile.uid) {
      fetchAvailability();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);
  
  const fetchAvailability = async () => {
    if (!userProfile || !userProfile.uid) return;
    setIsFetchingSlots(true);
    try {
      const slots = await getTeacherAvailability(userProfile.uid);
      setExistingSlots(slots);
    } catch (error) {
      console.error("Failed to fetch availability:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch existing availability." });
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const handleAddTimeSlot = () => {
    if (!selectedDate) {
      toast({ variant: "destructive", title: "Error", description: "Please select a date first." });
      return;
    }
    if (isPast(addDays(startOfDay(selectedDate),1)) && !isToday(selectedDate)) { 
       toast({ variant: "destructive", title: "Error", description: "Cannot add availability for past dates." });
       return;
    }
    setTimeSlots([...timeSlots, { date: selectedDate, startTime: "09:00", endTime: "10:00" }]);
  };

  const isToday = (someDate: Date) => {
    const today = new Date();
    return isEqual(startOfDay(someDate), startOfDay(today));
  };

  const handleTimeSlotChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index][field] = value;
    setTimeSlots(newTimeSlots);
  };

  const handleRemoveTimeSlot = (index: number) => {
    const newTimeSlots = timeSlots.filter((_, i) => i !== index);
    setTimeSlots(newTimeSlots);
  };
  
  const handleDeleteExistingSlot = async (slotId: string) => {
    setIsLoading(true);
    try {
      await deleteAvailabilitySlot(slotId);
      toast({ title: "Success", description: "Availability slot deleted." });
      fetchAvailability(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete slot." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAvailability = async () => {
    if (!userProfile || !userProfile.uid) return;
    if (timeSlots.length === 0) {
      toast({ variant: "destructive", title: "No Slots", description: "Please add at least one time slot." });
      return;
    }

    setIsLoading(true);
    try {
      const slotsToSave = timeSlots.map(slot => {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);

        const baseDate = new Date(slot.date);
        if (isNaN(baseDate.getTime())) {
            throw new Error(`Invalid date provided for a slot.`);
        }

        const startDate = setMilliseconds(setSeconds(setMinutes(setHours(baseDate, startH), startM),0),0);
        const endDate = setMilliseconds(setSeconds(setMinutes(setHours(baseDate, endH), endM),0),0);
        
        if (startDate >= endDate) {
          throw new Error(`Slot ${slot.startTime} - ${slot.endTime} on ${format(baseDate, "PPP")} has an invalid time range.`);
        }
        if (isPast(endDate) && !isToday(baseDate)) {
          throw new Error(`Slot ${slot.startTime} - ${slot.endTime} on ${format(baseDate, "PPP")} is in the past.`);
        }

        return {
          startTime: startDate.toISOString(), 
          endTime: endDate.toISOString(),   
        };
      });

      await addAvailability(userProfile.uid, slotsToSave);
      toast({ title: "Success!", description: "Your availability has been updated." });
      setTimeSlots([]); 
      fetchAvailability(); 
    } catch (error: any) {
      console.error("Failed to save availability:", error);
      toast({ variant: "destructive", title: "Error Saving Availability", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };


  if (authLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (userProfile?.role !== 'teacher') {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="font-headline">Access Denied</AlertTitle>
        <AlertDescription className="font-body">This page is only accessible to teachers.</AlertDescription>
      </Alert>
    );
  }
  
  const displayedDate = selectedDate || new Date(); 
  const normalizedDisplayedDateStart = startOfDay(displayedDate);


  const slotsForSelectedDate = existingSlots.filter(slot => {
    if (slot.startTime) {
      const slotDateStart = startOfDay(new Date(slot.startTime));
      return isEqual(slotDateStart, normalizedDisplayedDateStart) && !slot.isBooked;
    }
    return false;
  }).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const bookedSlotsForSelectedDate = existingSlots.filter(slot => {
    if (slot.startTime) {
      const slotDateStart = startOfDay(new Date(slot.startTime));
      return isEqual(slotDateStart, normalizedDisplayedDateStart) && slot.isBooked;
    }
    return false;
  }).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CalendarPlus className="mr-3 h-7 w-7 text-primary" /> Manage Your Availability
          </CardTitle>
          <CardDescription className="font-body">
            Select dates and add time slots when you are available for calls.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border p-0"
              disabled={(date) => isPast(date) && !isToday(date)} 
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Add New Time Slots for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-end gap-2 border p-3 rounded-md bg-muted/20">
                <div className="flex-1">
                  <Label htmlFor={`startTime-${index}`} className="font-body text-sm">Start Time</Label>
                  <Input 
                    id={`startTime-${index}`} 
                    type="time" 
                    value={slot.startTime} 
                    onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`endTime-${index}`} className="font-body text-sm">End Time</Label>
                  <Input 
                    id={`endTime-${index}`} 
                    type="time" 
                    value={slot.endTime} 
                    onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveTimeSlot(index)} aria-label="Remove slot">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button onClick={handleAddTimeSlot} variant="outline" className="font-body w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Time Slot for {selectedDate ? format(selectedDate, "PPP") : "..."}
            </Button>
            {timeSlots.length > 0 && (
              <Button onClick={handleSubmitAvailability} disabled={isLoading} className="font-body w-full sm:w-auto">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Added Slots
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
           <CardTitle className="font-headline text-lg">Current Availability for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isFetchingSlots ? (
            <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading slots...</div>
          ) : (
            <>
              {slotsForSelectedDate.length === 0 && bookedSlotsForSelectedDate.length === 0 && (
                <Alert>
                  <CalendarPlus className="h-4 w-4" />
                  <AlertTitle className="font-headline">No Availability</AlertTitle>
                  <AlertDescription className="font-body">You have no slots defined for this day. Add new slots above.</AlertDescription>
                </Alert>
              )}
              {slotsForSelectedDate.length > 0 && (
                <>
                  <h3 className="font-semibold mb-2 font-body text-md">Available Slots:</h3>
                  <ul className="space-y-2">
                    {slotsForSelectedDate.map(slot => (
                      <li key={slot.id} className="flex justify-between items-center p-3 border rounded-md bg-green-50 border-green-200">
                        <span className="font-body text-sm">
                          {format(new Date(slot.startTime), "p")} - {format(new Date(slot.endTime), "p")}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExistingSlot(slot.id)} aria-label="Delete slot" disabled={isLoading}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {bookedSlotsForSelectedDate.length > 0 && (
                <>
                  <h3 className="font-semibold mt-4 mb-2 font-body text-md">Booked Slots:</h3>
                  <ul className="space-y-2">
                    {bookedSlotsForSelectedDate.map(slot => (
                      <li key={slot.id} className="flex justify-between items-center p-3 border rounded-md bg-amber-50 border-amber-200">
                        <span className="font-body text-sm">
                          {format(new Date(slot.startTime), "p")} - {format(new Date(slot.endTime), "p")} (Booked by {slot.studentName || 'N/A'})
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
