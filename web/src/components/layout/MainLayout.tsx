export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,#f8fafc_45%,#f4f6fb)] px-4 py-10 lg:px-10">
      {children}
    </main>
  );
}
