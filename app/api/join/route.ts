import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function errorRedirect(req: Request, code: string): NextResponse {
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/settings?join_error=${code}`);
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin") ?? url.origin;
    const redirectTarget = encodeURIComponent(`/api/join${url.search}`);
    return NextResponse.redirect(
      `${origin}/sign-in?redirect_url=${redirectTarget}`,
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) return errorRedirect(req, "missing_token");

  const sb = getSupabaseAdmin();
  const { data: invite, error: iErr } = await sb
    .from("space_members")
    .select("*")
    .eq("id", token)
    .maybeSingle();
  if (iErr) return errorRedirect(req, "lookup_failed");
  if (!invite) return errorRedirect(req, "invalid_token");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const invitedEmail = String(invite.invited_email ?? "").toLowerCase();

  if (!email || email !== invitedEmail) {
    return errorRedirect(req, "email_mismatch");
  }

  if (invite.status === "accepted") {
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    return NextResponse.redirect(`${origin}/add`);
  }

  const { error: uErr } = await sb
    .from("space_members")
    .update({
      user_id: userId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", token);
  if (uErr) return errorRedirect(req, "update_failed");

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/add`);
}
