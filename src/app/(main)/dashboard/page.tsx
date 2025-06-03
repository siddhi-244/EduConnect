"use client";

import { useAuth } from "@/hooks/use-auth-hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, CalendarPlus, Users, BookOpenCheck } from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!userProfile) {
    return <div className="text-center py-10">Error loading user profile. Please try logging in again.</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Welcome to your Dashboard, {userProfile.displayName}!</CardTitle>
          <CardDescription className="font-body text-lg">
            Here you can manage your schedule and connect with others. You are logged in as a {userProfile.role}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title="My Schedule"
            description="View your upcoming and past scheduled sessions."
            href="/dashboard/my-schedule"
            icon={<BookOpenCheck className="h-8 w-8 text-primary" />}
            imageHint="calendar schedule"
          />
          {userProfile.role === 'teacher' && (
            <ActionCard
              title="Manage Availability"
              description="Set and update your available time slots for students to book."
              href="/dashboard/manage-availability"
              icon={<CalendarPlus className="h-8 w-8 text-primary" />}
              imageHint="teacher planning"
            />
          )}
          {userProfile.role === 'student' && (
            <ActionCard
              title="Find & Book a Session"
              description="Browse teacher availabilities and schedule your sessions."
              href="/dashboard/find-teacher"
              icon={<Users className="h-8 w-8 text-primary" />}
              imageHint="student studying"
            />
          )}
        </CardContent>
      </Card>

      <div className="text-center mt-8">
        <h3 className="text-2xl font-headline mb-4">Quick Links</h3>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="outline" asChild><Link href="/profile">Profile Settings</Link></Button>
          {/* Add more relevant quick links here */}
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  imageHint: string;
}

function ActionCard({ title, description, href, icon, imageHint }: ActionCardProps) {
  return (
    <Card className="flex flex-col hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-start gap-4 bg-muted/30 p-4 rounded-t-lg">
        <div className="p-2 bg-primary/10 rounded-full mt-1">
          {icon}
        </div>
        <div>
          <CardTitle className="font-headline text-xl">{title}</CardTitle>
          <CardDescription className="font-body text-sm text-foreground/70 mt-1">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
         <Image 
            src={`https://placehold.co/400x200.png`} 
            alt={title} 
            width={400} 
            height={200} 
            data-ai-hint={imageHint}
            className="w-full h-40 object-cover"
          />
      </CardContent>
      <div className="p-4 border-t">
        <Button asChild className="w-full font-body">
          <Link href={href}>Go to {title}</Link>
        </Button>
      </div>
    </Card>
  );
}
