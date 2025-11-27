import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher-server";

// POST /api/pusher/auth - Authenticate Pusher private channels
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.formData();
    const socketId = data.get("socket_id") as string;
    const channel = data.get("channel_name") as string;

    if (!socketId || !channel) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);

    // Validate channel access
    if (channel.startsWith("private-user-")) {
      // User can only access their own channels
      const channelUserId = channel.split("-")[2];
      if (channelUserId !== session.user.id && !isAdmin) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (channel.startsWith("private-admin-")) {
      // Only admins can access admin channels
      if (!isAdmin) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (channel.startsWith("private-conversation-")) {
      // For conversation channels, we'd need to verify the user is a participant
      // For now, we'll allow it and let the API routes handle access control
    }

    // Authorize the channel
    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
