import { Button } from "@sgscore/ui";
import Link from "next/link";

export default async function KioskHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-heading font-bold">Welcome</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Tap below to get started
      </p>
      <div className="mt-12 flex gap-6">
        <Link href={`/${orgSlug}/kiosk/tickets`}>
          <Button size="lg" className="h-20 px-12 text-xl">
            Buy Tickets
          </Button>
        </Link>
      </div>
    </div>
  );
}
