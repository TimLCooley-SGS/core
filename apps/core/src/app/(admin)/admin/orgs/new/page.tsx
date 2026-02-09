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
            will be provisioned automatically — this may take up to two minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrgForm />
        </CardContent>
      </Card>
    </div>
  );
}
