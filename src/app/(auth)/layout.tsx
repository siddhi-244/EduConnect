export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-background">
      {children}
    </div>
  );
}
