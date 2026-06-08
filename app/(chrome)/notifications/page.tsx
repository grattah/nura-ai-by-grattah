import Link from "next/link";
import { ChevronLeft, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

// Mark all unread notifications as read (fire-and-forget on page load)
async function markAllRead(userId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (error || !data?.claims || !user) {
    redirect("/auth/login");
  }

  const notifications = await getNotifications();

  // Mark all as read in the background after fetch
  if (notifications.some((n) => !n.read_at)) {
    await markAllRead(user.id);
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="p-0 h-auto min-h-11 min-w-11 text-foreground hover:opacity-70 transition-opacity gap-1 font-normal"
        >
          <Link href="/">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#E8836A" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      <main className="px-4 pb-10">
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </div>
        ) : (
          <EmptyNotifications />
        )}
      </main>
    </div>
  );
}

// ─── NotificationCard ─────────────────────────────────────────────────────────

function NotificationCard({ notification }: { notification: Notification }) {
  const isUnread = !notification.read_at;

  return (
    <Card
      className={cn(
        "border-0 rounded-3xl shadow-none overflow-hidden transition-colors",
        isUnread ? "bg-card" : "bg-card/60",
      )}
    >
      <CardContent className="p-5">
        {/* Title row */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
              isUnread ? "bg-foreground/10" : "bg-muted",
            )}
          >
            <Bell
              className={cn(
                "w-4.5 h-4.5",
                isUnread ? "text-foreground" : "text-muted-foreground",
              )}
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p
              className={cn(
                "text-base leading-snug truncate",
                isUnread
                  ? "font-bold text-foreground"
                  : "font-semibold text-foreground/70",
              )}
            >
              {notification.title}
            </p>
            {/* Unread dot */}
            {isUnread && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: "#E8836A" }}
              />
            )}
          </div>
        </div>

        {/* Body */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
          {notification.body}
        </p>

        <Separator className="bg-border mb-3" />

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {formatDate(notification.created_at)}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
      >
        <Bell className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold text-foreground mb-1">
        No notifications yet
      </p>
      <p className="text-sm text-muted-foreground">
        We'll let you know when there's something new.
      </p>
    </div>
  );
}
