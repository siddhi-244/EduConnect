"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth-hook';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConnectEdLogo } from '@/components/icons';
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Settings,
  LogOut,
  CalendarPlus,
  BookOpenCheck,
  Loader2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'CE';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  if (loading || !currentUser || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const commonMenuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/dashboard/my-schedule', label: 'My Schedule', icon: <BookOpenCheck /> },
    { href: '/profile', label: 'Profile Settings', icon: <Settings /> },
  ];

  const teacherMenuItems = [
    { href: '/dashboard/manage-availability', label: 'Manage Availability', icon: <CalendarPlus /> },
  ];

  const studentMenuItems = [
     { href: '/dashboard/find-teacher', label: 'Find & Book', icon: <Users /> },
  ];

  let menuItems = [...commonMenuItems];
  if (userProfile.role === 'teacher') {
    menuItems = [...menuItems, ...teacherMenuItems];
  } else if (userProfile.role === 'student') {
    menuItems = [...menuItems, ...studentMenuItems];
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-lg">
        <SidebarHeader className="p-4 flex flex-col items-center group-data-[collapsible=icon]:items-center">
           <Link href="/dashboard" className="mb-2 group-data-[collapsible=icon]:hidden">
            <ConnectEdLogo />
          </Link>
           <Link href="/dashboard" className="mb-2 hidden group-data-[collapsible=icon]:inline-block">
             <CalendarClock className="h-8 w-8 text-sidebar-primary" />
          </Link>
          <div className="flex flex-col items-center group-data-[collapsible=icon]:hidden text-center">
             <Avatar className="h-16 w-16 mb-2 border-2 border-sidebar-primary">
                <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "User"} />
                <AvatarFallback className="text-lg bg-sidebar-accent text-sidebar-accent-foreground">
                    {getInitials(userProfile.displayName)}
                </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm font-headline">{userProfile.displayName}</p>
            <p className="text-xs text-sidebar-foreground/70 font-body">Role: {userProfile.role}</p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  tooltip={{children: item.label, className: "font-body"}}
                >
                  <Link href={item.href} className="font-body">
                    {React.cloneElement(item.icon, { className: "mr-2 h-5 w-5" })}
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip={{children: "Logout", className: "font-body"}} className="font-body">
                  <LogOut className="mr-2 h-5 w-5" />
                  <span>Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="p-4 md:p-6 lg:p-8">
         {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
