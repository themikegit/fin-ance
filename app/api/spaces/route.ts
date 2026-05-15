import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: memberships, error: mErr } = await sb
    .from("space_members")
    .select("space_id, role")
    .eq("user_id", userId)
    .eq("status", "accepted");
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const ids = (memberships ?? []).map((m) => m.space_id as string);
  if (ids.length === 0) return NextResponse.json({ spaces: [] });

  const [{ data: spaces, error: sErr }, { data: allMembers, error: cErr }] =
    await Promise.all([
      sb.from("spaces").select("*").in("id", ids).order("created_at"),
      sb
        .from("space_members")
        .select("space_id, status")
        .in("space_id", ids)
        .eq("status", "accepted"),
    ]);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const m of allMembers ?? []) {
    const k = m.space_id as string;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const roleBySpace = new Map<string, string>();
  for (const m of memberships ?? []) {
    roleBySpace.set(m.space_id as string, m.role as string);
  }

  const result = (spaces ?? []).map((s) => ({
    ...s,
    member_count: counts.get(s.id) ?? 0,
    role: roleBySpace.get(s.id) ?? "member",
  }));
  return NextResponse.json({ spaces: result });
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

  const { name } = (body ?? {}) as { name?: unknown };
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const ownerEmail = user.primaryEmailAddress?.emailAddress ?? "";

  const sb = getSupabaseAdmin();
  const { data: space, error: sErr } = await sb
    .from("spaces")
    .insert({ name: name.trim(), owner_id: userId })
    .select()
    .single();
  if (sErr || !space) {
    return NextResponse.json(
      { error: sErr?.message ?? "create_failed" },
      { status: 500 },
    );
  }

  const { error: mErr } = await sb.from("space_members").insert({
    space_id: space.id,
    user_id: userId,
    invited_email: ownerEmail,
    role: "owner",
    status: "accepted",
    accepted_at: new Date().toISOString(),
  });
  if (mErr) {
    await sb.from("spaces").delete().eq("id", space.id);
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      space: { ...space, member_count: 1, role: "owner" },
    },
    { status: 201 },
  );
}
