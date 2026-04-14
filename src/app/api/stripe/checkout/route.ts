import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** Subscription checkout — wire Stripe keys in production. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;

  if (!secret || !price) {
    return NextResponse.json({
      ok: false,
      message:
        "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable $5/mo billing.",
    });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret, { typescript: true });

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/settings?checkout=success`,
    cancel_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/settings?checkout=cancel`,
    customer_email: session.user.email ?? undefined,
    metadata: { userId: session.user.id },
  });

  return NextResponse.json({ url: checkout.url });
}
