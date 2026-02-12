"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sgscore/ui";
import { Minus, Plus, Check, ShoppingCart } from "lucide-react";
import type { TicketType, TicketPriceType } from "@sgscore/types/tenant";
import { useCart } from "@/lib/cart-provider";

interface TicketCardProps {
  ticket: TicketType;
  priceTypes: TicketPriceType[];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getDisplayPrice(pt: TicketPriceType): string {
  if (pt.price_cents != null) {
    return formatCents(pt.price_cents);
  }
  if (pt.day_prices) {
    const values = Object.values(pt.day_prices).filter(
      (v): v is number => v != null,
    );
    if (values.length > 0) {
      const min = Math.min(...values);
      return `from ${formatCents(min)}`;
    }
  }
  return "Price TBD";
}

export function TicketCard({ ticket, priceTypes }: TicketCardProps) {
  const { addItem } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  function setQty(priceTypeId: string, qty: number) {
    setQuantities((prev) => ({
      ...prev,
      [priceTypeId]: Math.max(0, qty),
    }));
  }

  const hasSelections = Object.values(quantities).some((q) => q > 0);

  function handleAddToCart() {
    for (const pt of priceTypes) {
      const qty = quantities[pt.id] ?? 0;
      if (qty <= 0) continue;

      const priceCents = pt.price_cents ?? pt.target_price_cents ?? 0;

      addItem({
        type: "ticket",
        id: `${ticket.id}-${pt.id}`,
        name: `${ticket.name} — ${pt.name}`,
        priceCents,
        quantity: qty,
      });
    }

    setQuantities({});
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <Card className="flex flex-col">
      {ticket.banner_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ticket.banner_image_url}
          alt=""
          className="w-full rounded-t-lg object-cover"
          style={{ aspectRatio: "16 / 9" }}
        />
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{ticket.name}</CardTitle>
        {ticket.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {ticket.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Price tiers */}
        <div className="space-y-3">
          {priceTypes.map((pt) => {
            const qty = quantities[pt.id] ?? 0;
            return (
              <div
                key={pt.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{pt.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getDisplayPrice(pt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setQty(pt.id, qty - 1)}
                    disabled={qty === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">
                    {qty}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setQty(pt.id, qty + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          {priceTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No price tiers configured.
            </p>
          )}
        </div>

        {/* Add to cart */}
        <Button
          onClick={handleAddToCart}
          disabled={!hasSelections || added}
          className="w-full gap-2"
        >
          {added ? (
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
}
