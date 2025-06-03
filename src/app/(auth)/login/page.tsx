import { LoginForm } from "@/components/auth/auth-forms";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - ConnectEd',
  description: 'Login to your ConnectEd account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
