import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Users, CalendarDays, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline text-primary">
                  ConnectEd: Seamless Scheduling for Teachers and Students
                </h1>
                <p className="max-w-[600px] text-foreground/80 md:text-xl font-body">
                  Empowering education through easy, flexible, and reliable call scheduling. Teachers manage their availability, students book with ease.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg" className="font-body">
                  <Link href="/signup">Get Started Today</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="font-body">
                  <Link href="/login">Login</Link>
                </Button>
              </div>
            </div>
            <Image
              src="https://placehold.co/600x400.png"
              alt="Hero"
              width={600}
              height={400}
              data-ai-hint="education online learning"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-lg border-2 border-primary/20"
            />
          </div>
        </div>
      </section>

      <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-body text-primary font-medium">
              Key Features
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
              Why Choose ConnectEd?
            </h2>
            <p className="max-w-[900px] text-foreground/70 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed font-body">
              ConnectEd is designed to simplify communication and scheduling in the educational sphere, fostering better teacher-student interaction.
            </p>
          </div>
          <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="h-8 w-8 text-primary" />}
              title="Easy Availability Management"
              description="Teachers can effortlessly set and update their available time slots on a clear, intuitive calendar."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-primary" />}
              title="Simple Student Scheduling"
              description="Students can view teacher schedules and book calls in just a few clicks, finding times that work for them."
            />
            <FeatureCard
              icon={<Mail className="h-8 w-8 text-primary" />}
              title="Automated Notifications"
              description="Instant email confirmations for bookings, cancellations, and reschedules for both teachers and students."
            />
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8 text-primary" />}
              title="Concurrency Safe"
              description="Robust system ensures time slots are booked accurately, preventing double bookings."
            />
             <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>}
              title="Secure & Reliable"
              description="Built with modern technology to ensure your data is safe and the platform is always available."
            />
             <FeatureCard
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>}
              title="Accessible Anywhere"
              description="Responsive design ensures ConnectEd works beautifully on desktops, tablets, and mobile devices."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-2 bg-primary/10 rounded-md">
          {icon}
        </div>
        <CardTitle className="font-headline text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="font-body text-foreground/70">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
