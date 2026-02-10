"use client";

import { useState, useEffect, useActionState } from "react";
import {
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@sgscore/ui";
import { Plus, Trash2 } from "lucide-react";
import type { SgsStaffRole, SgsStaffStatus } from "@sgscore/types";
import type { StaffWithIdentity } from "@sgscore/api";
import {
  addTeamMember,
  removeTeamMember,
  deleteTeamMember,
  updateTeamMemberRole,
} from "./actions";

const roleColors: Record<SgsStaffRole, string> = {
  admin: "bg-purple-100 text-purple-800",
  support: "bg-blue-100 text-blue-800",
  engineering: "bg-amber-100 text-amber-800",
  billing: "bg-emerald-100 text-emerald-800",
};

const statusColors: Record<SgsStaffStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
};

const ROLES: SgsStaffRole[] = ["admin", "support", "engineering", "billing"];

function displayName(member: StaffWithIdentity): string {
  return member.global_identity.display_name || member.global_identity.primary_email;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TeamManagement({ members }: { members: StaffWithIdentity[] }) {
  const [statusFilter, setStatusFilter] = useState<SgsStaffStatus>("active");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<StaffWithIdentity | null>(null);

  const [addState, addAction, addPending] = useActionState(addTeamMember, {});
  const [removeState, removeAction, removePending] = useActionState(removeTeamMember, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTeamMember, {});
  const [roleState, roleAction] = useActionState(updateTeamMemberRole, {});

  // Close dialogs on success (useEffect only fires on value *change*, not stale true)
  useEffect(() => {
    if (addState.success) setAddDialogOpen(false);
  }, [addState.success]);

  useEffect(() => {
    if (removeState.success) setActionTarget(null);
  }, [removeState.success]);

  useEffect(() => {
    if (deleteState.success) setActionTarget(null);
  }, [deleteState.success]);

  const filtered = members.filter((m) => m.status === statusFilter);
  const activeCount = members.filter((m) => m.status === "active").length;
  const inactiveCount = members.filter((m) => m.status === "inactive").length;

  return (
    <div className="space-y-4">
      {/* Warning banner (e.g. email failed) */}
      {addState.warning && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {addState.warning}
        </div>
      )}

      {/* Top bar: filter + add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === "active"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === "inactive"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a new member to the SGS platform team.
              </DialogDescription>
            </DialogHeader>
            <form action={addAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="team@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              {addState.error && (
                <p className="text-sm text-destructive">{addState.error}</p>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={addPending}>
                  {addPending ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No {statusFilter} team members.
        </p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {displayName(member)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.global_identity.primary_email}
                  </td>
                  <td className="px-4 py-3">
                    {member.status === "active" ? (
                      <RoleDropdown
                        staffId={member.id}
                        currentRole={member.role}
                        roleAction={roleAction}
                      />
                    ) : (
                      <Badge
                        variant="secondary"
                        className={roleColors[member.role]}
                      >
                        {member.role}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={statusColors[member.status]}
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(member.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setActionTarget(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Remove / Delete Confirmation Dialog */}
      <Dialog
        open={actionTarget !== null}
        onOpenChange={(open) => !open && setActionTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              What would you like to do with{" "}
              <span className="font-medium">
                {actionTarget && displayName(actionTarget)}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          {(removeState.error || deleteState.error) && (
            <p className="text-sm text-destructive">
              {removeState.error || deleteState.error}
            </p>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {actionTarget?.status === "active" && (
              <form action={removeAction} className="w-full">
                <input type="hidden" name="staffId" value={actionTarget?.id ?? ""} />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={removePending}
                >
                  {removePending ? "Deactivating..." : "Mark as Inactive"}
                </Button>
              </form>
            )}
            <form action={deleteAction} className="w-full">
              <input type="hidden" name="staffId" value={actionTarget?.id ?? ""} />
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={deletePending}
              >
                {deletePending ? "Deleting..." : "Permanently Delete"}
              </Button>
            </form>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setActionTarget(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleDropdown({
  staffId,
  currentRole,
  roleAction,
}: {
  staffId: string;
  currentRole: SgsStaffRole;
  roleAction: (payload: FormData) => void;
}) {
  function handleRoleChange(newRole: string) {
    if (newRole === currentRole) return;
    const fd = new FormData();
    fd.set("staffId", staffId);
    fd.set("role", newRole);
    roleAction(fd);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="cursor-pointer">
          <Badge
            variant="secondary"
            className={`${roleColors[currentRole]} hover:opacity-80 transition-opacity`}
          >
            {currentRole}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={currentRole} onValueChange={handleRoleChange}>
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
