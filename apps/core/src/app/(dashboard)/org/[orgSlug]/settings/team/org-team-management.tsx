"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import {
  Button,
  Input,
  Label,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { useHasCapability } from "@/components/org-provider";
import type { StaffMember, OrgRole } from "./page";
import {
  addStaffAssignment,
  removeStaffAssignment,
  deleteStaffAssignment,
  updateStaffRole,
} from "./actions";

interface OrgTeamManagementProps {
  orgSlug: string;
  staff: StaffMember[];
  roles: OrgRole[];
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
};

function displayName(member: StaffMember): string {
  return `${member.person.first_name} ${member.person.last_name}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrgTeamManagement({
  orgSlug,
  staff,
  roles,
}: OrgTeamManagementProps) {
  const canManage = useHasCapability("staff.manage");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<StaffMember | null>(null);

  const [addState, addAction, addPending] = useActionState(addStaffAssignment, {});
  const [roleState, roleAction] = useActionState(updateStaffRole, {});

  const [actionPending, startAction] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (addState.success) setAddDialogOpen(false);
  }, [addState.success]);

  function handleDeactivate(assignmentId: string) {
    setActionError(null);
    startAction(async () => {
      const fd = new FormData();
      fd.set("orgSlug", orgSlug);
      fd.set("assignmentId", assignmentId);
      const result = await removeStaffAssignment({}, fd);
      if (result.error) {
        setActionError(result.error);
      } else {
        setActionTarget(null);
      }
    });
  }

  function handleDelete(assignmentId: string) {
    setActionError(null);
    startAction(async () => {
      const fd = new FormData();
      fd.set("orgSlug", orgSlug);
      fd.set("assignmentId", assignmentId);
      const result = await deleteStaffAssignment({}, fd);
      if (result.error) {
        setActionError(result.error);
      } else {
        setActionTarget(null);
      }
    });
  }

  const filtered = staff.filter((m) => m.status === statusFilter);
  const activeCount = staff.filter((m) => m.status === "active").length;
  const inactiveCount = staff.filter((m) => m.status === "inactive").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

          {canManage && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Staff Member</DialogTitle>
                  <DialogDescription>
                    Assign a person a staff role within this organization.
                  </DialogDescription>
                </DialogHeader>
                <form action={addAction} className="space-y-4">
                  <input type="hidden" name="orgSlug" value={orgSlug} />
                  <div className="space-y-2">
                    <Label htmlFor="st-email">Email</Label>
                    <Input
                      id="st-email"
                      name="email"
                      type="email"
                      placeholder="staff@example.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="st-first">First Name</Label>
                      <Input
                        id="st-first"
                        name="firstName"
                        placeholder="Jane"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="st-last">Last Name</Label>
                      <Input
                        id="st-last"
                        name="lastName"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="st-role">Role</Label>
                    <select
                      id="st-role"
                      name="roleId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">Select a role...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
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
                      {addPending ? "Adding..." : "Add Staff"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Staff List */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No {statusFilter} staff members.
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
                  <th className="px-4 py-3 text-left font-medium">Since</th>
                  {canManage && (
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {displayName(member)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.person.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canManage && member.status === "active" ? (
                        <RoleDropdown
                          orgSlug={orgSlug}
                          assignmentId={member.id}
                          currentRoleId={member.role_id}
                          currentRoleName={member.role.name}
                          roles={roles}
                          roleAction={roleAction}
                        />
                      ) : (
                        <Badge variant="secondary">{member.role.name}</Badge>
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
                      {formatDate(member.started_at)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            setActionError(null);
                            setActionTarget(member);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
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
              <DialogTitle>Remove Staff Member</DialogTitle>
              <DialogDescription>
                What would you like to do with{" "}
                <span className="font-medium">
                  {actionTarget && displayName(actionTarget)}
                </span>
                ?
              </DialogDescription>
            </DialogHeader>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {actionTarget?.status === "active" && (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={actionPending}
                  onClick={() =>
                    actionTarget && handleDeactivate(actionTarget.id)
                  }
                >
                  {actionPending ? "Processing..." : "Mark as Inactive"}
                </Button>
              )}
              <Button
                variant="destructive"
                className="w-full"
                disabled={actionPending}
                onClick={() =>
                  actionTarget && handleDelete(actionTarget.id)
                }
              >
                {actionPending ? "Processing..." : "Permanently Delete"}
              </Button>
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
      </CardContent>
    </Card>
  );
}

function RoleDropdown({
  orgSlug,
  assignmentId,
  currentRoleId,
  currentRoleName,
  roles,
  roleAction,
}: {
  orgSlug: string;
  assignmentId: string;
  currentRoleId: string;
  currentRoleName: string;
  roles: OrgRole[];
  roleAction: (payload: FormData) => void;
}) {
  function handleRoleChange(newRoleId: string) {
    if (newRoleId === currentRoleId) return;
    const fd = new FormData();
    fd.set("orgSlug", orgSlug);
    fd.set("assignmentId", assignmentId);
    fd.set("roleId", newRoleId);
    roleAction(fd);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="cursor-pointer">
          <Badge
            variant="secondary"
            className="hover:opacity-80 transition-opacity"
          >
            {currentRoleName}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={currentRoleId}
          onValueChange={handleRoleChange}
        >
          {roles.map((r) => (
            <DropdownMenuRadioItem key={r.id} value={r.id}>
              {r.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
