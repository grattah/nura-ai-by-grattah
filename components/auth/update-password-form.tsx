"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import posthog from "posthog-js";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { sendPasswordChangedEmail } from "@/actions/password-changed";
import { PasswordRequirements, isPasswordValid } from "./PasswordRequirements";
import { EyeOff, Eye, LockKeyhole, X } from "lucide-react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = isPasswordValid(password) && passwordsMatch;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { has_password: true },
      });
      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Best-effort confirmation email; must run before sign-out while the
      // recovery session is still active.
      await sendPasswordChangedEmail();

      // Password changed — sign out of the recovery session and have the
      // user log back in with their new password.
      await supabase.auth.signOut();
      posthog.reset();
      router.push(
        `/log-back-in?email=${encodeURIComponent(user?.email ?? "")}`,
      );
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <div className={cn("flex flex-col gap-6 pt-5", className)} {...props}>
      <div className="flex w-full justify-end">
        <button
          className="p-2 rounded-full bg-[#E8E6DC] hover:bg-[#D8D6CC]"
          onClick={goBack}
        >
          <X size={24} />
        </button>
      </div>
      <div>
        <div className="text-center flex flex-col items-center space-y-2">
          <div className="p-3 rounded-full bg-mint-green w-min">
            <LockKeyhole color="#FFFFFF" size={24} />
          </div>
          <p className="text-xl text-base-text font-semibold">Reset password</p>
          <p className="text-subtle text-sm">Create your new secure password</p>
        </div>
        <div className="mt-6">
          <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <label
                  htmlFor="password"
                  className="text-subtle text-sm font-medium"
                >
                  Enter new password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={20}
                    color={password ? "#57605E" : "#9CA5A3"}
                    className="absolute top-4.75 left-3"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 rounded-sm bg-white text-foreground placeholder:text-muted-foreground border outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-4.75 right-3"
                  >
                    {showPassword ? (
                      <Eye size={20} color="#57605E" />
                    ) : (
                      <EyeOff size={20} color="#9CA5A3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="confirm-password"
                  className="text-subtle text-sm font-medium"
                >
                  Re-enter new password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={20}
                    color={confirmPassword ? "#57605E" : "#9CA5A3"}
                    className="absolute top-4.75 left-3"
                  />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 rounded-sm bg-white text-foreground placeholder:text-muted-foreground border outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute top-4.75 right-3"
                  >
                    {showConfirmPassword ? (
                      <Eye size={20} color="#57605E" />
                    ) : (
                      <EyeOff size={20} color="#9CA5A3" />
                    )}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <PasswordRequirements password={password} />
              <button
                type="submit"
                className="w-full flex items-center justify-center bg-mint-green text-[#FFFFFF] py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity disabled:opacity-40"
                disabled={!password || isLoading || !canSubmit}
              >
                {isLoading ? "Reseting..." : "Reset"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
