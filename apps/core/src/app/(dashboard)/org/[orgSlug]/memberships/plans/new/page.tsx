import { PlanEditor } from "../plan-editor";

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return <PlanEditor orgSlug={orgSlug} />;
}
