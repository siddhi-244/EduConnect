"use client";

import { useAuth } from "@/hooks/use-auth-hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserCircle, Save, Edit3, Upload } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // Assuming storage is also exported if used
import { doc, setDoc } from "firebase/firestore";
// If using Firebase Storage for photoURL:
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  // email: z.string().email(), // Email usually not changed here, or needs verification
  // photoURL: z.string().url().optional(), // For file upload, this will be handled differently
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { userProfile, currentUser, loading: authLoading, setProfileData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  // const [imagePreview, setImagePreview] = useState<string | null>(null);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || "",
      });
      // setImagePreview(userProfile.photoURL || null);
    }
  }, [userProfile, form]);

  const getInitials = (name?: string | null) => {
    if (!name) return 'CE';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  // const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   if (event.target.files && event.target.files[0]) {
  //     const file = event.target.files[0];
  //     setProfileImageFile(file);
  //     setImagePreview(URL.createObjectURL(file));
  //   }
  // };

  async function onSubmit(values: ProfileFormValues) {
    if (!currentUser || !userProfile) return;
    setIsLoading(true);
    try {
      let newPhotoURL = userProfile.photoURL;

      // // Firebase Storage for photo upload (example)
      // if (profileImageFile) {
      //   const storage = getStorage();
      //   const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${profileImageFile.name}`);
      //   const snapshot = await uploadBytes(storageRef, profileImageFile);
      //   newPhotoURL = await getDownloadURL(snapshot.ref);
      // }

      // Update Firebase Auth profile
      await updateFirebaseProfile(currentUser, { 
        displayName: values.displayName,
        // photoURL: newPhotoURL 
      });
      
      // Update Firestore profile
      const updatedProfileData = { 
        displayName: values.displayName,
        // photoURL: newPhotoURL,
      };
      await setProfileData(updatedProfileData); // Uses context's setProfileData

      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Profile update failed:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || !userProfile) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <UserCircle className="mr-3 h-7 w-7 text-primary" /> Profile Settings
          </CardTitle>
          <CardDescription className="font-body">
            View and update your account details.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-4 border-primary/50">
            <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "User"} />
            <AvatarFallback className="text-3xl bg-muted">
              {getInitials(userProfile.displayName)}
            </AvatarFallback>
          </Avatar>
          {/* {isEditing && (
            <div className="relative">
              <Button size="sm" variant="outline" asChild>
                <Label htmlFor="profile-image-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" /> Change Photo
                </Label>
              </Button>
              <Input 
                id="profile-image-upload" 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange}
              />
            </div>
          )} */}
          <CardTitle className="font-headline text-2xl">{userProfile.displayName}</CardTitle>
          <CardDescription className="font-body">{userProfile.email} ({userProfile.role})</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} readOnly={!isEditing} className={!isEditing ? "bg-muted/50 border-transparent" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Email is generally not editable directly without verification flows */}
              <FormItem>
                <FormLabel className="font-body">Email Address</FormLabel>
                <Input value={userProfile.email || ""} readOnly className="bg-muted/50 border-transparent" />
                 <p className="text-xs text-muted-foreground font-body">Email cannot be changed here.</p>
              </FormItem>

              {isEditing ? (
                <div className="flex space-x-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false);
                    form.reset({ displayName: userProfile.displayName || "" });
                    // setImagePreview(userProfile.photoURL || null);
                  }} className="font-body">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="font-body">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)} className="w-full font-body">
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
