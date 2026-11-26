import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAuthenticatedAdmin } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getAuthenticatedAdmin();
  if (admin) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/spring-pal-logo.png"
            alt="Spring Pal"
            width={132}
            height={59}
            className="h-11 w-auto object-contain"
          />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Admin Portal Sign In
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with your Spring Pal admin account to review leads.
          </p>
        </div>

        <AdminLoginForm />
      </div>
    </main>
  );
}
