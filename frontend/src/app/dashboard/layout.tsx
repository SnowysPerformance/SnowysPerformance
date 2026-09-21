import { AuthProvider } from "@/components/AuthProvider";
import NavBar from "@/components/NavBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-void">
        <NavBar />
        <main className="flex-1 p-4 pt-20 md:p-8">{children}</main>
      </div>
    </AuthProvider>
  );
}
