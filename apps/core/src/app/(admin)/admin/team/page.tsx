import { getAllStaff } from "@sgscore/api";
import { TeamManagement } from "./team-management";

export default async function AdminTeamPage() {
  const members = await getAllStaff();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">
          {members.length} team member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      <TeamManagement members={members} />
    </div>
  );
}
