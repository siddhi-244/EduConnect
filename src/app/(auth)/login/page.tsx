import { LoginForm } from "@/components/auth/auth-forms";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - EduConnect',
  description: 'Login to your EduConnect account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
