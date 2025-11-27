import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { CHANNELS, EVENTS } from "@/lib/pusher-client";
import { ConversationType, ParticipantRole } from "@prisma/client";

// GET /api/chat/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (isAdmin) {
      // Admins can see all conversations or filter by status
      if (status) {
        where.status = status;
      }
    } else {
      // Regular users only see their own conversations
      where.participants = {
        some: { userId: session.user.id },
      };
    }

    const conversations = await prisma.conversation.findMany({
      where,
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
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(
          (p) => p.userId === session.user.id
        );
        const lastReadAt = participant?.lastReadAt || new Date(0);

        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: conv.id,
            createdAt: { gt: lastReadAt },
            senderId: { not: session.user.id },
          },
        });

        return {
          ...conv,
          unreadCount,
          lastMessage: conv.messages[0] || null,
        };
      })
    );

    return NextResponse.json(conversationsWithUnread);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/chat/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type = "SUPPORT", title, bookingId, initialMessage } = body;

    // Check if user already has an open support conversation
    if (type === "SUPPORT") {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: "SUPPORT",
          status: { in: ["OPEN", "WAITING"] },
          participants: {
            some: { userId: session.user.id, role: "CUSTOMER" },
          },
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

      if (existingConversation) {
        return NextResponse.json(existingConversation);
      }
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: type as ConversationType,
        title: title || `Support Request`,
        bookingId,
        participants: {
          create: {
            userId: session.user.id,
            role: ParticipantRole.CUSTOMER,
          },
        },
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

    // If there's an initial message, create it
    if (initialMessage) {
      const message = await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: session.user.id,
          content: initialMessage,
          type: "TEXT",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Notify admins about new conversation
      await pusherServer.trigger(
        CHANNELS.adminChat,
        EVENTS.NEW_MESSAGE,
        {
          conversationId: conversation.id,
          message,
          isNewConversation: true,
        }
      );
    }

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
