"use client";

import { useState } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sgscore/ui";
import { Check, ShoppingCart } from "lucide-react";
import type { MembershipPlan } from "@sgscore/types/tenant";
import { useCart } from "@/lib/cart-provider";

interface MembershipsClientProps {
  plans: MembershipPlan[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(days: number): string {
  if (days === 365) return "/year";
  if (days === 730) return "/2 years";
  if (days === 30) return "/month";
  if (days === 90) return "/quarter";
  if (days === 180) return "/6 months";
  return ` for ${days} days`;
}

function findBestValue(plans: MembershipPlan[]): string | null {
  if (plans.length <= 1) return null;
  let best: MembershipPlan | null = null;
  let bestRatio = 0;
  for (const plan of plans) {
    if (plan.price_cents === 0) continue;
    const ratio = (plan.seat_count * plan.duration_days) / plan.price_cents;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = plan;
    }
  }
  return best?.id ?? null;
}

export function MembershipsClient({ plans }: MembershipsClientProps) {
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);
  const bestValueId = findBestValue(plans);

  function handleAddToCart(plan: MembershipPlan) {
    addItem({
      type: "membership",
      id: plan.id,
      name: plan.name,
      priceCents: plan.price_cents,
      quantity: 1,
    });

    setAddedId(plan.id);
    setTimeout(() => setAddedId(null), 2000);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const isBestValue = plan.id === bestValueId;
        const isAdded = addedId === plan.id;

        return (
          <Card
            key={plan.id}
            className={`flex flex-col ${isBestValue ? "ring-2 ring-[var(--color-primary)]" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {isBestValue && (
                  <Badge className="bg-[var(--color-primary)] text-white shrink-0">
                    Best Value
                  </Badge>
                )}
              </div>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  {formatPrice(plan.price_cents)}
                  <span className="text-base font-normal text-muted-foreground">
                    {formatDuration(plan.duration_days)}
                  </span>
                </p>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  {plan.seat_count === 1
                    ? "Individual membership"
                    : `Family / Group — ${plan.seat_count} seats`}
                </p>
                {plan.is_recurring && <p>Auto-renewing</p>}
              </div>

              <Button
                onClick={() => handleAddToCart(plan)}
                disabled={isAdded}
                className="w-full gap-2"
                variant={isBestValue ? "default" : "outline"}
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
