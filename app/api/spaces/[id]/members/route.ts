import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: spaceId } = await context.params;
  if (!spaceId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: caller, error: cErr } = await sb
    .from("space_members")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!caller) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: members, error: mErr } = await sb
    .from("space_members")
    .select("*")
    .eq("space_id", spaceId)
    .order("invited_at");
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const userIds = (members ?? [])
    .map((m) => m.user_id as string | null)
    .filter((id): id is string => !!id);

  const nameById = new Map<string, string>();
  if (userIds.length > 0) {
    try {
      const client = await clerkClient();
      const { data: users } = await client.users.getUserList({
        userId: userIds,
        limit: Math.min(userIds.length, 100),
      });
      for (const u of users) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
          u.username ||
          u.primaryEmailAddress?.emailAddress ||
          u.id;
        nameById.set(u.id, name);
      }
    } catch {
      // fall back silently to email
    }
  }

  const enriched = (members ?? []).map((m) => ({
    ...m,
    display_name:
      (m.user_id && nameById.get(m.user_id as string)) ||
      (m.invited_email as string),
  }));

  return NextResponse.json({ members: enriched });
}
