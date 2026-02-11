import { DesignEditor } from "../design-editor";

export default async function NewTicketDesignPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New Ticket Design</h2>
      <DesignEditor orgSlug={orgSlug} />
    </div>
  );
}
