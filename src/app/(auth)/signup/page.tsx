import { SignupForm } from "@/components/auth/auth-forms";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - ConnectEd',
  description: 'Create your ConnectEd account.',
};

export default function SignupPage() {
  return <SignupForm />;
}
