"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sgscore/ui";
import { Check, ShoppingCart } from "lucide-react";
import type { MembershipCardDesign } from "@sgscore/types/tenant";
import { useCart } from "@/lib/cart-provider";

interface MembershipsClientProps {
  cards: MembershipCardDesign[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MembershipsClient({ cards }: MembershipsClientProps) {
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  function handleAddToCart(card: MembershipCardDesign) {
    addItem({
      type: "membership",
      id: card.id,
      name: card.name,
      priceCents: card.price_cents,
      quantity: 1,
    });

    setAddedId(card.id);
    setTimeout(() => setAddedId(null), 2000);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const isAdded = addedId === card.id;

        return (
          <Card key={card.id} className="flex flex-col overflow-hidden">
            {/* Card thumbnail */}
            <div
              className="w-full border-b"
              style={{
                aspectRatio: "3.375 / 2.125",
                backgroundColor: card.background_color,
              }}
            >
              {card.front_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.front_image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="space-y-1 text-center">
                    <div
                      className="h-1 w-8 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: card.accent_color }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: card.font_color }}
                    >
                      {card.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{card.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {card.price_cents > 0 && (
                <p className="text-3xl font-bold">
                  {formatPrice(card.price_cents)}
                </p>
              )}

              <Button
                onClick={() => handleAddToCart(card)}
                disabled={isAdded}
                className="w-full gap-2"
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
