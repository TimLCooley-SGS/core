"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-provider";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, totalCents } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Cart</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">
                Add items to your cart to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalFormatted = (totalCents / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">Cart</h1>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y pt-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${(item.priceCents / 100).toFixed(2)} each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="w-20 text-right font-medium">
                ${((item.priceCents * item.quantity) / 100).toFixed(2)}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">Total</span>
            <span className="text-lg font-bold">${totalFormatted}</span>
          </div>
          <Button className="mt-4 w-full" size="lg">
            Proceed to Checkout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
