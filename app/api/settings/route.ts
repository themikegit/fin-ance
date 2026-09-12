import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

// Per-user preferences live in Clerk private metadata (server-only), so no
// database migration is needed. Read the raw value defensively: it can be
// absent, or something we did not write.
function readSavings(meta: Record<string, unknown> | undefined): number | null {
  const raw = meta?.monthly_savings;
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return NextResponse.json({
      settings: { monthly_savings: readSavings(user.privateMetadata) },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { monthly_savings } = (body ?? {}) as { monthly_savings?: unknown };

  // null / "" clears the goal; otherwise it must be a positive number.
  let resolved: number | null;
  if (monthly_savings === null || monthly_savings === "" || monthly_savings === undefined) {
    resolved = null;
  } else {
    const n =
      typeof monthly_savings === "number"
        ? monthly_savings
        : Number.parseFloat(String(monthly_savings));
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    }
    resolved = n > 0 ? n : null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.updateUserMetadata(userId, {
      privateMetadata: { monthly_savings: resolved },
    });
    return NextResponse.json({
      settings: { monthly_savings: readSavings(user.privateMetadata) },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
