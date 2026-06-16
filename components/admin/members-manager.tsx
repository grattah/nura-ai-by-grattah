"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSIGNABLE_ROLES, type AdminRole } from "@/lib/admin/roles";
import { inviteAdmin, changeRole, removeAdmin } from "@/actions/admin-members";

export interface Member {
  user_id: string;
  role: AdminRole;
  email: string | null;
  created_at: string;
}

export function MembersManager({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("editor");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await inviteAdmin(email, role);
      if ("error" in res) setError(res.error);
      else {
        setNotice(`Invitation sent to ${email}.`);
        setEmail("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Invite */}
      <form
        onSubmit={invite}
        className="bg-card border border-border rounded-3xl p-5 space-y-4 max-w-xl"
      >
        <p className="font-medium text-foreground">Invite an admin</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Invite"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-success-c600">{notice}</p>}
      </form>

      {/* List */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="w-40">Role</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <MemberRow
                key={m.user_id}
                member={m}
                isSelf={m.user_id === currentUserId}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isOwner = member.role === "owner";

  function onRole(next: string) {
    startTransition(async () => {
      const res = await changeRole(member.user_id, next);
      if ("error" in res) alert(res.error);
      else router.refresh();
    });
  }

  function onRemove() {
    if (!confirm(`Remove ${member.email}?`)) return;
    startTransition(async () => {
      const res = await removeAdmin(member.user_id);
      if ("error" in res) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {member.email}
        {isSelf && (
          <span className="text-muted-foreground text-xs"> (you)</span>
        )}
      </TableCell>
      <TableCell>
        {isOwner ? (
          <Badge>owner</Badge>
        ) : (
          <Select
            value={member.role}
            onValueChange={onRole}
            disabled={pending}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className="text-right">
        {!isOwner && !isSelf && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onRemove}
            disabled={pending}
          >
            Remove
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
