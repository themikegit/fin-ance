import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("incomes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incomes: data ?? [] });
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

  const { label, amount } = (body ?? {}) as {
    label?: unknown;
    amount?: unknown;
  };

  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "invalid_label" }, { status: 400 });
  }
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount));
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("incomes")
    .insert({ user_id: userId, label: label.trim(), amount: numericAmount })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ income: data }, { status: 201 });
}
