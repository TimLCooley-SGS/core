import { notFound } from "next/navigation";
import { getList, getTags, getListMembers } from "../../actions";
import { ListForm } from "../../components/list-form";

export default async function EditListPage({
  params,
}: {
  params: Promise<{ orgSlug: string; listId: string }>;
}) {
  const { orgSlug, listId } = await params;
  const [list, tags, { members }] = await Promise.all([
    getList(orgSlug, listId),
    getTags(orgSlug),
    getListMembers(orgSlug, listId),
  ]);

  if (!list) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit List</h1>
      <ListForm tags={tags} existingList={list} existingMembers={members} />
    </div>
  );
}
