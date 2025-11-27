import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { CHANNELS, EVENTS } from "@/lib/pusher-client";
import { ConversationStatus, ParticipantRole } from "@prisma/client";

// GET /api/chat/conversations/[id] - Get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
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
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check if user has access to this conversation
    const isParticipant = conversation.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isAdmin && !isParticipant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update last read time for the user
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: id,
        userId: session.user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PATCH /api/chat/conversations/[id] - Update conversation (status, add participant)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, joinAsSupport } = body;

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check access
    const isParticipant = conversation.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isAdmin && !isParticipant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Join conversation as support agent
    if (joinAsSupport && isAdmin) {
      const existingParticipant = conversation.participants.find(
        (p) => p.userId === session.user.id
      );

      if (!existingParticipant) {
        await prisma.conversationParticipant.create({
          data: {
            conversationId: id,
            userId: session.user.id,
            role: ParticipantRole.SUPPORT,
          },
        });

        // Create system message
        await prisma.chatMessage.create({
          data: {
            conversationId: id,
            senderId: session.user.id,
            content: `${session.user.name || "Support agent"} joined the conversation`,
            type: "SYSTEM",
          },
        });

        // Notify participants
        await pusherServer.trigger(
          CHANNELS.conversation(id),
          EVENTS.USER_JOINED,
          {
            userId: session.user.id,
            name: session.user.name,
            role: "SUPPORT",
          }
        );
      }
    }

    // Update status
    if (status) {
      const updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          status: status as ConversationStatus,
          ...(status === "CLOSED" ? { closedAt: new Date() } : {}),
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      // If closing, create system message and notify
      if (status === "CLOSED") {
        await prisma.chatMessage.create({
          data: {
            conversationId: id,
            senderId: session.user.id,
            content: "This conversation has been closed",
            type: "SYSTEM",
          },
        });

        await pusherServer.trigger(
          CHANNELS.conversation(id),
          EVENTS.CONVERSATION_CLOSED,
          { closedBy: session.user.name }
        );
      }

      return NextResponse.json(updatedConversation);
    }

    // Return updated conversation
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}
