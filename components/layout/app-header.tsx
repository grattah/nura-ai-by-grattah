import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { SignInHeaderLink } from "./sign-in-header-link";
interface AppHeaderUser {
  name: string;
  email?: string;
  avatar: string;
  avatarLetter: string;
  isSubscriber?: boolean;
}

interface AppHeaderProps {
  user: AppHeaderUser | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="z-40 px-6 py-2">
      <div className="flex items-center justify-between h-10">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1 py-1 px-3 rounded-full liquid-glass"
        >
          <Image src="/icon.svg" alt="Nuko Logo" width={20} height={20} />
          <span className="text-xl font-semibold text-brown tracking-tight">
            Nuko
          </span>
        </Link>

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-2">
            {/* Avatar — navigates to /account */}
            <Link
              href="/account"
              className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-[#D4C48A] hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "#227B6F" }}
              aria-label="Account"
            >
              {user?.avatar ? (
                <Image
                  alt="avatar"
                  src={user?.avatar}
                  width={32}
                  height={32}
                  className="object-cover size-10 rounded-full"
                />
              ) : (
                user.avatarLetter
              )}
            </Link>
          </div>
        ) : (
          <Suspense
            fallback={
              <Link
                href="/auth/login"
                className="text-base font-semibold text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4 py-1 px-4 rounded-full liquid-glass"
              >
                Sign in
              </Link>
            }
          >
            <SignInHeaderLink className="text-base font-semibold text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4 py-1 px-4 rounded-full liquid-glass" />
          </Suspense>
        )}
      </div>
    </header>
  );
}
