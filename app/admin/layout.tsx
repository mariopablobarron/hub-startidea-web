import { auth, signOut } from "@/auth";
import { AdminSidebar } from "./_components/AdminSidebar";

export const metadata = { title: "Admin · HUB Startidea", robots: "noindex" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // /admin/login no usa este layout porque tiene su propio diseño full-screen.
  // Si por alguna razón alguien sin sesión llega aquí, el middleware ya redirigió.
  if (!session?.user) {
    return <div className="p-8">{children}</div>;
  }

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper-2)]">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-8">
        <AdminSidebar email={session.user.email ?? ""} signOutAction={signOutAction} />
        <main id="admin-main" className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
