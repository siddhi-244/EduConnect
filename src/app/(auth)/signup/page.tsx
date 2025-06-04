import { SignupForm } from "@/components/auth/auth-forms";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - EduConnect',
  description: 'Create your EduConnect account.',
};

export default function SignupPage() {
  return <SignupForm />;
}
