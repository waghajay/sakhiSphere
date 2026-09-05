import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Socket, Server as SocketIOServer } from "socket.io";
import { Expo } from "expo-server-sdk";
import { getPrisma } from "../config/database";
import { env } from "../config/env";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userEmail?: string;
}

export class ChatSocket {
  private io: SocketIOServer;
  private onlineUsers: Map<number, Set<string>> = new Map();
  private expo: Expo;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.expo = new Expo();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      try {
        const decoded = jwt.verify(token, env.jwt.secret) as {
          id: number;
          email: string;
        };
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        next();
      } catch (error) {
        return next(new Error("Invalid token"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      const userId = socket.userId;
      console.log(`🔌 User ${userId} connected to chat`);

      if (!this.onlineUsers.has(userId!)) {
        this.onlineUsers.set(userId!, new Set());
      }
      this.onlineUsers.get(userId!)!.add(socket.id);

      this.io.emit("user:online", { userId });
      console.log(`✅ User ${userId} is online`);

      socket.join(`user:${userId}`);
      this.joinUserConversations(socket, userId!);

      socket.on("conversation:join", (conversationId: number) => {
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${userId} joined conversation ${conversationId}`);
      });

      socket.on("conversation:leave", (conversationId: number) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${userId} left conversation ${conversationId}`);
      });

      socket.on(
        "message:send",
        async (data: {
          conversationId: number;
          content: string;
          messageType?: string;
          mediaUrls?: string[];
        }) => {
          try {
            const {
              conversationId,
              content,
              messageType = "text",
              mediaUrls = [],
            } = data;

            if ((!content || !content.trim()) && mediaUrls.length === 0) {
              socket.emit("message:error", {
                error: "Message content is required",
              });
              return;
            }

            const prisma = getPrisma();

            const member = await prisma.conversationMember.findUnique({
              where: {
                conversationId_userId: {
                  conversationId,
                  userId: userId!,
                },
              },
            });

            if (!member) {
              socket.emit("message:error", {
                error: "You are not a member of this conversation",
              });
              return;
            }

            const message = await prisma.message.create({
              data: {
                conversationId,
                senderId: userId!,
                content: content.trim(),
                messageType: messageType as any,
                mediaUrls: mediaUrls,
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    isVerified: true,
                    profile: {
                      select: { avatarUrl: true },
                    },
                  },
                },
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            // Get other members
            const otherMembers = await prisma.conversationMember.findMany({
              where: {
                conversationId,
                userId: { not: userId },
              },
            });

            const formattedMessage = {
              id: message.id,
              conversationId: message.conversationId,
              content: message.content,
              messageType: message.messageType,
              mediaUrls: message.mediaUrls || [],
              isRead: message.isRead,
              createdAt: message.createdAt,
              sender: {
                id: message.sender.id,
                name: message.sender.name,
                isVerified: message.sender.isVerified,
                avatarUrl: message.sender.profile?.avatarUrl || null,
              },
            };

            // Emit to conversation room
            this.io
              .to(`conversation:${conversationId}`)
              .emit("message:new", formattedMessage);
            socket.emit("message:sent", formattedMessage);

            // Send push notifications to offline users
            this.sendPushNotifications(otherMembers, message, conversationId);
          } catch (error) {
            console.error("Failed to send message:", error);
            socket.emit("message:error", { error: "Failed to send message" });
          }
        },
      );

      socket.on("typing:start", (data: { conversationId: number }) => {
        socket.to(`conversation:${data.conversationId}`).emit("typing:start", {
          conversationId: data.conversationId,
          userId,
        });
      });

      socket.on("typing:stop", (data: { conversationId: number }) => {
        socket.to(`conversation:${data.conversationId}`).emit("typing:stop", {
          conversationId: data.conversationId,
          userId,
        });
      });

      socket.on("message:read", async (data: { conversationId: number }) => {
        try {
          const prisma = getPrisma();

          const result = await prisma.message.updateMany({
            where: {
              conversationId: data.conversationId,
              senderId: { not: userId },
              isRead: false,
            },
            data: { isRead: true },
          });

          this.io
            .to(`conversation:${data.conversationId}`)
            .emit("messages:read", {
              conversationId: data.conversationId,
              readerId: userId,
              count: result.count,
            });
        } catch (error) {
          console.error("Failed to mark messages as read:", error);
        }
      });

      socket.on(
        "message:delete",
        async (data: { conversationId: number; messageId: number }) => {
          try {
            const prisma = getPrisma();

            const message = await prisma.message.findUnique({
              where: { id: data.messageId },
            });

            if (!message || message.senderId !== userId) {
              socket.emit("message:error", {
                error: "You can only delete your own messages",
              });
              return;
            }

            await prisma.message.delete({
              where: { id: data.messageId },
            });

            this.io
              .to(`conversation:${data.conversationId}`)
              .emit("message:deleted", {
                conversationId: data.conversationId,
                messageId: data.messageId,
              });
          } catch (error) {
            console.error("Failed to delete message:", error);
            socket.emit("message:error", { error: "Failed to delete message" });
          }
        },
      );

      socket.on(
        "user:check_online",
        (data: { userId: number }, callback: (response: any) => void) => {
          const isOnline = this.isUserOnline(data.userId);
          callback({ userId: data.userId, isOnline });
        },
      );

      socket.on("disconnect", () => {
        console.log(`🔌 User ${userId} disconnected from chat`);

        const userSockets = this.onlineUsers.get(userId!);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.onlineUsers.delete(userId!);
            this.io.emit("user:offline", { userId });
            console.log(`❌ User ${userId} is offline`);
          }
        }
      });
    });
  }

  /**
   * Send push notifications to users who are offline.
   */
  private async sendPushNotifications(
    otherMembers: any[],
    message: any,
    conversationId: number,
  ) {
    try {
      const prisma = getPrisma();

      for (const member of otherMembers) {
        // Skip if user is online (socket already handles real-time)
        if (this.isUserOnline(member.userId)) {
          continue;
        }

        // Get push tokens for this user
        const pushTokens = await prisma.pushToken.findMany({
          where: { userId: member.userId },
        });

        if (pushTokens.length === 0) continue;

        const notificationBody = message.mediaUrls && message.mediaUrls.length > 0
          ? "📷 Image"
          : message.content;

        const messages = pushTokens
          .filter((pt) => Expo.isExpoPushToken(pt.token))
          .map((pt) => ({
            to: pt.token,
            sound: "default",
            title: message.sender.name,
            body: notificationBody,
            data: { conversationId, messageId: message.id },
          }));

        if (messages.length > 0) {
          try {
            const chunks = this.expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
              await this.expo.sendPushNotificationsAsync(chunk);
            }
            console.log(`📨 Sent push notification to user ${member.userId}`);
          } catch (error) {
            console.error("Failed to send push notification:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error sending push notifications:", error);
    }
  }

  private async joinUserConversations(socket: Socket, userId: number) {
    try {
      const prisma = getPrisma();
      const memberships = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });

      for (const membership of memberships) {
        socket.join(`conversation:${membership.conversationId}`);
        console.log(
          `User ${userId} auto-joined conversation ${membership.conversationId}`,
        );
      }
    } catch (error) {
      console.error("Failed to join user conversations:", error);
    }
  }

  private isUserOnline(userId: number): boolean {
    return (
      this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0
    );
  }

  getIO(): SocketIOServer {
    return this.io;
  }
}