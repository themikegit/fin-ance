import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isCategoryId } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { amount, category, name, created_at } =
    (body ?? {}) as {
      amount?: unknown;
      category?: unknown;
      name?: unknown;
      created_at?: unknown;
    };

  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount));
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  if (!isCategoryId(category)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    user_id: userId,
    amount: numericAmount,
    category,
    name: typeof name === "string" && name.trim() ? name.trim() : null,
  };
  if (typeof created_at === "string" && created_at) {
    insert.created_at = created_at;
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("expenses")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense: data }, { status: 201 });
}
