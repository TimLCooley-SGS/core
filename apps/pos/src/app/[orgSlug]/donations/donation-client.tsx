"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@sgscore/ui";
import { Heart, Check } from "lucide-react";
import type { DonationPageConfig } from "@sgscore/types";
import { useCart } from "@/lib/cart-provider";

interface DonationPageClientProps {
  config: DonationPageConfig;
}

export function DonationPageClient({ config }: DonationPageClientProps) {
  const { addItem } = useCart();
  const [selectedCents, setSelectedCents] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [added, setAdded] = useState(false);

  function getAmountCents(): number | null {
    if (isCustom) {
      const dollars = parseFloat(customAmount);
      if (isNaN(dollars) || dollars <= 0) return null;
      return Math.round(dollars * 100);
    }
    return selectedCents;
  }

  function handleAddToCart() {
    const cents = getAmountCents();
    if (!cents) return;

    addItem({
      type: "donation",
      id: `donation-${Date.now()}`,
      name: config.campaignName || "Donation",
      priceCents: cents,
      quantity: 1,
    });

    setAdded(true);
    setSelectedCents(null);
    setCustomAmount("");
    setIsCustom(false);
    setTimeout(() => setAdded(false), 2000);
  }

  const amountCents = getAmountCents();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-[var(--color-primary)]" />
          {config.title}
        </CardTitle>
        {config.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {config.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset denominations */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {config.denominations.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => {
                setSelectedCents(cents);
                setIsCustom(false);
                setCustomAmount("");
              }}
              className={`rounded-lg border-2 px-4 py-3 text-center font-semibold transition-colors ${
                !isCustom && selectedCents === cents
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-border hover:border-[var(--color-primary)]/50"
              }`}
            >
              ${(cents / 100).toFixed(0)}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        {config.allowCustomAmount && (
          <div className="space-y-2">
            <Label htmlFor="customAmount">Custom Amount</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="customAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setIsCustom(true);
                    setSelectedCents(null);
                  }}
                  onFocus={() => {
                    setIsCustom(true);
                    setSelectedCents(null);
                  }}
                  className="pl-7"
                  placeholder="Enter amount"
                />
              </div>
            </div>
          </div>
        )}

        {/* Add to cart */}
        <Button
          onClick={handleAddToCart}
          disabled={!amountCents || added}
          className="w-full gap-2"
          size="lg"
        >
          {added ? (
            <>
              <Check className="h-5 w-5" />
              Added!
            </>
          ) : (
            <>
              <Heart className="h-5 w-5" />
              {amountCents
                ? `Add $${(amountCents / 100).toFixed(2)} to Cart`
                : "Select an Amount"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
