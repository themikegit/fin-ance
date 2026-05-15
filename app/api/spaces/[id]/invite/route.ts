import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: spaceId } = await context.params;
  if (!spaceId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { email } = (body ?? {}) as { email?: unknown };
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();

  const sb = getSupabaseAdmin();
  const { data: membership, error: mErr } = await sb
    .from("space_members")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: existing, error: eErr } = await sb
    .from("space_members")
    .select("id, status")
    .eq("space_id", spaceId)
    .ilike("invited_email", normalized)
    .maybeSingle();
  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  let token: string;
  if (existing) {
    token = existing.id as string;
  } else {
    const { data: inserted, error: iErr } = await sb
      .from("space_members")
      .insert({
        space_id: spaceId,
        invited_email: normalized,
        role: "member",
        status: "pending",
      })
      .select("id")
      .single();
    if (iErr || !inserted) {
      return NextResponse.json(
        { error: iErr?.message ?? "insert_failed" },
        { status: 500 },
      );
    }
    token = inserted.id as string;
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const inviteUrl = `${origin}/api/join?token=${token}`;
  return NextResponse.json({ token, inviteUrl });
}
