import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const scope = new URL(req.url).searchParams.get("space_id");

  if (scope) {
    const { data: caller, error: cErr } = await sb
      .from("space_members")
      .select("id")
      .eq("space_id", scope)
      .eq("user_id", userId)
      .eq("status", "accepted")
      .maybeSingle();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if (!caller) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { data: members, error: mErr } = await sb
      .from("space_members")
      .select("user_id")
      .eq("space_id", scope)
      .eq("status", "accepted");
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

    const ids = (members ?? [])
      .map((m) => m.user_id as string | null)
      .filter((id): id is string => !!id);
    if (ids.length === 0) return NextResponse.json({ monthly_expenses: [] });

    const { data, error } = await sb
      .from("monthly_expenses")
      .select("*")
      .in("user_id", ids)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ monthly_expenses: data ?? [] });
  }

  const { data, error } = await sb
    .from("monthly_expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ monthly_expenses: data ?? [] });
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

  const { label, amount, months } = (body ?? {}) as {
    label?: unknown;
    amount?: unknown;
    months?: unknown;
  };

  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "invalid_label" }, { status: 400 });
  }
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount));
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  let resolvedMonths: number | null = null;
  if (months !== undefined && months !== null && months !== "") {
    const n =
      typeof months === "number" ? months : Number.parseInt(String(months), 10);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "invalid_months" }, { status: 400 });
    }
    resolvedMonths = n;
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("monthly_expenses")
    .insert({
      user_id: userId,
      label: label.trim(),
      amount: numericAmount,
      months: resolvedMonths,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ monthly_expense: data }, { status: 201 });
}
