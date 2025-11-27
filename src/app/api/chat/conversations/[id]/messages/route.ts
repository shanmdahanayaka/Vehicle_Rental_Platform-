import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { CHANNELS, EVENTS } from "@/lib/pusher-client";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";

// POST /api/chat/conversations/[id]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { content, type = "TEXT", metadata } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);

    // Get conversation and check access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check if user is participant or admin
    const isParticipant = conversation.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isAdmin && !isParticipant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If admin is not a participant, add them
    if (isAdmin && !isParticipant) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId: session.user.id,
          role: "SUPPORT",
        },
      });
    }

    // Create the message
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: session.user.id,
        content: content.trim(),
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    // Update conversation timestamp and status
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        status: isAdmin ? "WAITING" : "OPEN",
      },
    });

    // Update sender's last read time
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: session.user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // Send real-time message via Pusher
    await pusherServer.trigger(
      CHANNELS.conversation(conversationId),
      EVENTS.NEW_MESSAGE,
      { message }
    );

    // Send notifications to other participants
    const otherParticipants = conversation.participants.filter(
      (p) => p.userId !== session.user.id
    );

    for (const participant of otherParticipants) {
      const notificationData = NotificationTemplates.newChatMessage(
        session.user.name || "Someone",
        conversationId
      );

      await sendNotification({
        userId: participant.userId,
        ...notificationData,
      });
    }

    // If message is from customer, notify admins
    if (!isAdmin) {
      await pusherServer.trigger(
        CHANNELS.adminChat,
        EVENTS.NEW_MESSAGE,
        {
          conversationId,
          message,
        }
      );
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// GET /api/chat/conversations/[id]/messages - Get messages (with pagination)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before"); // Cursor for pagination

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);

    // Check access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isAdmin && !isParticipant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    // Update last read time
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: session.user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
