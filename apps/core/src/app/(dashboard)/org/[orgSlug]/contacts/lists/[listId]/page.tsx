import { notFound } from "next/navigation";
import { getList, getListMembers } from "../actions";
import { ListDetail } from "../components/list-detail";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; listId: string }>;
}) {
  const { orgSlug, listId } = await params;
  const list = await getList(orgSlug, listId);
  if (!list) notFound();

  const { members } = await getListMembers(orgSlug, listId);

  return <ListDetail list={list} members={members} />;
}
