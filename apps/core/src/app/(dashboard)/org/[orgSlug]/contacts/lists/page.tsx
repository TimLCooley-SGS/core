import { getLists } from "./actions";
import { ListsOverview } from "./components/lists-overview";

export default async function ListsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const lists = await getLists(orgSlug);

  return <ListsOverview lists={lists} />;
}
