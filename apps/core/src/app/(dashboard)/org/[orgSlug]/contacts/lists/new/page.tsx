import { getTags } from "../actions";
import { ListForm } from "../components/list-form";

export default async function NewListPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const tags = await getTags(orgSlug);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New List</h1>
      <ListForm tags={tags} />
    </div>
  );
}
