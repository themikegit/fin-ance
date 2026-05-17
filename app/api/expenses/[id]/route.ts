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
  const { amount, category_id, name, created_at } = (body ?? {}) as {
    amount?: unknown;
    category_id?: unknown;
    name?: unknown;
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

  const sb = getSupabaseAdmin();

  if (category_id !== undefined) {
    if (category_id === null) {
      update.category_id = null;
    } else {
      if (typeof category_id !== "string" || !category_id) {
        return NextResponse.json(
          { error: "invalid_category" },
          { status: 400 },
        );
      }
      const { data: cat, error: cErr } = await sb
        .from("categories")
        .select("id")
        .eq("id", category_id)
        .maybeSingle();
      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
      if (!cat) {
        return NextResponse.json(
          { error: "category_not_found" },
          { status: 400 },
        );
      }
      update.category_id = category_id;
    }
  }

  if (name !== undefined) {
    if (name === null) {
      update.name = null;
    } else if (typeof name === "string") {
      update.name = name.trim() || null;
    } else {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }
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

  const { data, error } = await sb
    .from("expenses")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ expense: data });
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
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
