import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@sgscore/ui";
import { CreateOrgForm } from "./create-org-form";

export default function CreateOrgPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
          <CardDescription>
            Register a new organization on the platform. The Supabase project
            will need to be provisioned separately via the CLI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrgForm />
        </CardContent>
      </Card>
    </div>
  );
}
