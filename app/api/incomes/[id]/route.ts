import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { amount, kind, created_at } = (body ?? {}) as {
    amount?: unknown;
    kind?: unknown;
    created_at?: unknown;
  };

  const update: Record<string, unknown> = {};

  if (amount !== undefined) {
    const n =
      typeof amount === "number" ? amount : Number.parseFloat(String(amount));
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    }
    update.amount = n;
  }

  if (kind !== undefined) {
    if (kind !== "salary" && kind !== "other") {
      return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    update.kind = kind;
  }

  if (created_at !== undefined) {
    if (typeof created_at !== "string" || !created_at) {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }
    const d = new Date(created_at);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }
    update.created_at = d.toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("incomes")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ income: data });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("incomes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
