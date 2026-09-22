import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma, MeetingRole } from '@prisma/client';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { env } from '../config/env';

export interface CreateMeetingDto {
  title: string;
  description?: string;
  scheduledAt?: string | Date | null;
  isInstant?: boolean;
  maxParticipants?: number | null;
  isLiveStream?: boolean;
  eventId?: number | null;
  groupId?: number | null;
  inviteUserIds?: number[];
}

export interface UpdateMeetingDto {
  title?: string;
  description?: string;
  scheduledAt?: string | Date | null;
  maxParticipants?: number | null;
  isLiveStream?: boolean;
}

export class MeetingsService {
  /**
   * Generate Agora channel name (unique, URL-safe)
   */
  private static generateChannelName(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return `ss_${ts}_${rand}`;
  }

  /**
   * Creates a new meeting.
   */
  static async createMeeting(hostId: number, data: CreateMeetingDto) {
    const prisma = getPrisma();

    // Validation
    if (!data.title || !data.title.trim()) {
      throw new CustomError('Meeting title is required', 400);
    }
    if (data.title.length > 200) {
      throw new CustomError('Title must be less than 200 characters', 400);
    }

    const isInstant = data.isInstant ?? false;
    let scheduledAt: Date | null = null;

    if (!isInstant) {
      if (!data.scheduledAt) {
        throw new CustomError('Scheduled date/time is required for non-instant meetings', 400);
      }
      scheduledAt = new Date(data.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        throw new CustomError('Invalid scheduled date/time', 400);
      }
    }

    if (data.maxParticipants !== undefined && data.maxParticipants !== null) {
      if (data.maxParticipants < 2) {
        throw new CustomError('Maximum participants must be at least 2', 400);
      }
      if (data.maxParticipants > 100) {
        throw new CustomError('Maximum participants cannot exceed 100', 400);
      }
    }

    // Optional group membership check
    if (data.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId: hostId } },
      });
      if (!member) {
        throw new CustomError('You must be a member of the group to host meetings in it', 403);
      }
    }

    // Optional event ownership check
    if (data.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: data.eventId },
      });
      if (!event) {
        throw new CustomError('Event not found', 404);
      }
      if (event.organizerId !== hostId) {
        throw new CustomError('Only the event organizer can attach a meeting', 403);
      }
    }

    const channelName = this.generateChannelName();

    // Create meeting + host participant in one transaction
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        channelName,
        hostId,
        scheduledAt,
        isInstant,
        maxParticipants: data.maxParticipants ?? null,
        isLiveStream: data.isLiveStream ?? false,
        eventId: data.eventId || null,
        groupId: data.groupId || null,
        participants: {
          create: {
            userId: hostId,
            role: 'host',
          },
        },
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        group: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
        _count: { select: { participants: true } },
      },
    });

    // Invite other users if provided
    if (data.inviteUserIds && data.inviteUserIds.length > 0) {
      const uniqueIds = [...new Set(data.inviteUserIds)].filter(
        (uid) => uid !== hostId
      );

      if (uniqueIds.length > 0) {
        await prisma.meetingParticipant.createMany({
          data: uniqueIds.map((userId) => ({
            meetingId: meeting.id,
            userId,
            role: 'speaker' as MeetingRole,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.formatMeeting(meeting, hostId);
  }

  /**
   * Lists meetings with filters.
   */
  static async getMeetings(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      filter?: 'upcoming' | 'past' | 'hosted' | 'invited' | 'all';
      groupId?: number;
      eventId?: number;
    } = {}
  ) {
    const prisma = getPrisma();
    const { page = 1, limit = 20, filter = 'upcoming', groupId, eventId } = options;
    const skip = (page - 1) * limit;
    const now = new Date();

    const AND: Prisma.MeetingWhereInput[] = [];

    if (groupId) AND.push({ groupId });
    if (eventId) AND.push({ eventId });

    switch (filter) {
      case 'upcoming':
        AND.push({
          OR: [
            { scheduledAt: { gte: now } },
            { startedAt: { not: null }, endedAt: null },
          ],
        });
        AND.push({
          OR: [
            { hostId: userId },
            { participants: { some: { userId } } },
          ],
        });
        break;
      case 'past':
        AND.push({ endedAt: { not: null } });
        AND.push({
          OR: [
            { hostId: userId },
            { participants: { some: { userId } } },
          ],
        });
        break;
      case 'hosted':
        AND.push({ hostId: userId });
        break;
      case 'invited':
        AND.push({ participants: { some: { userId } } });
        AND.push({ NOT: { hostId: userId } });
        break;
      case 'all':
      default:
        break;
    }

    const where: Prisma.MeetingWhereInput = AND.length > 0 ? { AND } : {};

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        include: {
          host: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          group: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
          participants: {
            where: { userId },
            select: { role: true },
          },
          _count: { select: { participants: true } },
        },
        orderBy: [
          { startedAt: 'desc' },
          { scheduledAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.meeting.count({ where }),
    ]);

    return {
      meetings: meetings.map((m) => this.formatMeeting(m, userId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Gets a single meeting.
   */
  static async getMeeting(meetingId: number, userId?: number) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        group: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
        participants: {
          where: { userId: userId ?? -1 },
          select: { role: true },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!meeting) {
      throw new CustomError('Meeting not found', 404);
    }

    return this.formatMeeting(meeting, userId);
  }

  /**
   * Updates a meeting (host only).
   */
  static async updateMeeting(meetingId: number, userId: number, data: UpdateMeetingDto) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new CustomError('Meeting not found', 404);
    if (meeting.hostId !== userId) {
      throw new CustomError('Only the host can edit this meeting', 403);
    }
    if (meeting.startedAt && !meeting.endedAt) {
      throw new CustomError('Cannot edit a meeting that is in progress', 400);
    }

    const updateData: Prisma.MeetingUpdateInput = {};

    if (data.title !== undefined) {
      if (!data.title.trim()) throw new CustomError('Title cannot be empty', 400);
      updateData.title = data.title.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.scheduledAt !== undefined) {
      if (data.scheduledAt === null) {
        updateData.scheduledAt = null;
      } else {
        const d = new Date(data.scheduledAt);
        if (isNaN(d.getTime())) throw new CustomError('Invalid scheduled time', 400);
        updateData.scheduledAt = d;
      }
    }
    if (data.maxParticipants !== undefined) {
      if (data.maxParticipants !== null && (data.maxParticipants < 2 || data.maxParticipants > 100)) {
        throw new CustomError('Max participants must be between 2 and 100', 400);
      }
      updateData.maxParticipants = data.maxParticipants;
    }
    if (data.isLiveStream !== undefined) {
      updateData.isLiveStream = data.isLiveStream;
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        group: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
        participants: { where: { userId }, select: { role: true } },
        _count: { select: { participants: true } },
      },
    });

    return this.formatMeeting(updated, userId);
  }

  /**
   * Deletes/cancels a meeting (host only).
   */
  static async deleteMeeting(meetingId: number, userId: number) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new CustomError('Meeting not found', 404);
    if (meeting.hostId !== userId) {
      throw new CustomError('Only the host can delete this meeting', 403);
    }

    await prisma.meeting.delete({ where: { id: meetingId } });

    return { success: true, message: 'Meeting deleted successfully' };
  }

  /**
   * Starts a meeting (host only). Marks startedAt.
   */
  static async startMeeting(meetingId: number, userId: number) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new CustomError('Meeting not found', 404);
    if (meeting.hostId !== userId) {
      throw new CustomError('Only the host can start this meeting', 403);
    }
    if (meeting.startedAt && !meeting.endedAt) {
      return { success: true, message: 'Meeting already in progress' };
    }
    if (meeting.endedAt) {
      throw new CustomError('Meeting has already ended', 400);
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { startedAt: new Date() },
    });

    return { success: true, message: 'Meeting started' };
  }

  /**
   * Ends a meeting (host only).
   */
  static async endMeeting(meetingId: number, userId: number) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new CustomError('Meeting not found', 404);
    if (meeting.hostId !== userId) {
      throw new CustomError('Only the host can end this meeting', 403);
    }
    if (!meeting.startedAt) {
      throw new CustomError('Meeting has not started yet', 400);
    }
    if (meeting.endedAt) {
      return { success: true, message: 'Meeting already ended' };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.meeting.update({
        where: { id: meetingId },
        data: { endedAt: now },
      }),
      prisma.meetingParticipant.updateMany({
        where: { meetingId, leftAt: null },
        data: { leftAt: now },
      }),
    ]);

    return { success: true, message: 'Meeting ended' };
  }

  /**
   * Gets an Agora RTC token for joining the meeting.
   */
  static async getAgoraToken(meetingId: number, userId: number) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: { where: { userId }, select: { role: true } },
        host: { select: { id: true } },
      },
    });

    if (!meeting) throw new CustomError('Meeting not found', 404);

    // Access control: must be host OR invited participant OR linked to a group the user is in
    let hasAccess = false;
    let role: MeetingRole = 'audience';

    if (meeting.hostId === userId) {
      hasAccess = true;
      role = 'host';
    } else if (meeting.participants.length > 0) {
      hasAccess = true;
      role = meeting.participants[0].role;
    } else if (meeting.groupId) {
      const groupMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: meeting.groupId, userId } },
      });
      if (groupMember) {
        hasAccess = true;
        role = 'audience';
        // Auto-add as participant
        await prisma.meetingParticipant.create({
          data: { meetingId, userId, role: 'audience' },
        }).catch(() => {});
      }
    }

    if (!hasAccess) {
      throw new CustomError('You do not have access to this meeting', 403);
    }

    if (!env.agora.appId || !env.agora.appCertificate) {
      throw new CustomError('Agora credentials not configured', 500);
    }

    // Agora UID must be a 32-bit unsigned integer
    const uid = userId;

    // Host + speaker get PUBLISHER role, audience gets SUBSCRIBER (unless live stream where audience subscribes)
    const agoraRole =
      meeting.isLiveStream && role === 'audience'
        ? RtcRole.SUBSCRIBER
        : RtcRole.PUBLISHER;

    // Token valid for 2 hours
    const expirationTimeInSeconds = 7200;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      env.agora.appId,
      env.agora.appCertificate,
      meeting.channelName,
      uid,
      agoraRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    return {
      token,
      appId: env.agora.appId,
      channelName: meeting.channelName,
      uid,
      role,
      expiresAt: privilegeExpiredTs,
      isLiveStream: meeting.isLiveStream,
    };
  }

  /**
   * Marks a participant as joined (records join time).
   */
  static async joinMeeting(meetingId: number, userId: number) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new CustomError('Meeting not found', 404);

    // Only record join if not yet started? Actually record regardless
    await prisma.meetingParticipant.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create: {
        meetingId,
        userId,
        role: 'audience',
        joinedAt: new Date(),
      },
      update: {
        joinedAt: new Date(),
        leftAt: null,
      },
    });

    // Auto-start meeting if not started (host joining first)
    if (!meeting.startedAt && meeting.hostId === userId) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { startedAt: new Date() },
      });
    }

    return { success: true, message: 'Joined meeting' };
  }

  /**
   * Marks a participant as left.
   */
  static async leaveMeeting(meetingId: number, userId: number) {
    const prisma = getPrisma();

    const participant = await prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });

    if (!participant) {
      throw new CustomError('You are not a participant of this meeting', 400);
    }

    await prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: { leftAt: new Date() },
    });

    return { success: true, message: 'Left meeting' };
  }

  /**
   * Lists participants of a meeting.
   */
  static async getParticipants(meetingId: number, page = 1, limit = 50) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const [participants, total] = await Promise.all([
      prisma.meetingParticipant.findMany({
        where: { meetingId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
        },
        orderBy: [{ role: 'asc' }, { invitedAt: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.meetingParticipant.count({ where: { meetingId } }),
    ]);

    return {
      participants: participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        isVerified: p.user.isVerified,
        avatarUrl: p.user.profile?.avatarUrl || null,
        role: p.role,
        invitedAt: p.invitedAt,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Invite users to a meeting (host only).
   */
  static async inviteUsers(meetingId: number, hostId: number, userIds: number[]) {
    const prisma = getPrisma();

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new CustomError('Meeting not found', 404);
    if (meeting.hostId !== hostId) {
      throw new CustomError('Only the host can invite users', 403);
    }

    const uniqueIds = [...new Set(userIds)].filter((uid) => uid !== hostId);
    if (uniqueIds.length === 0) {
      return { success: true, message: 'No new users to invite' };
    }

    await prisma.meetingParticipant.createMany({
      data: uniqueIds.map((userId) => ({
        meetingId,
        userId,
        role: 'speaker' as MeetingRole,
      })),
      skipDuplicates: true,
    });

    return { success: true, message: `Invited ${uniqueIds.length} users` };
  }

  /**
   * Format meeting for API response.
   */
  private static formatMeeting(meeting: any, userId?: number) {
    const myParticipation =
      meeting.participants && meeting.participants.length > 0
        ? meeting.participants[0]
        : null;

    const isHost = meeting.hostId === userId;
    const myRole = isHost ? 'host' : myParticipation?.role || null;
    const canJoin = isHost || Boolean(myParticipation);

    return {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      channelName: meeting.channelName,
      scheduledAt: meeting.scheduledAt,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      isInstant: meeting.isInstant,
      isLiveStream: meeting.isLiveStream,
      maxParticipants: meeting.maxParticipants,
      recordingUrl: meeting.recordingUrl,
      host: meeting.host
        ? {
            id: meeting.host.id,
            name: meeting.host.name,
            isVerified: meeting.host.isVerified,
            avatarUrl: meeting.host.profile?.avatarUrl || null,
          }
        : null,
      group: meeting.group ? { id: meeting.group.id, name: meeting.group.name } : null,
      event: meeting.event ? { id: meeting.event.id, title: meeting.event.title } : null,
      participantCount: meeting._count?.participants ?? 0,
      isHost,
      myRole,
      canJoin,
      isLive: Boolean(meeting.startedAt && !meeting.endedAt),
      status: meeting.endedAt
        ? 'ended'
        : meeting.startedAt
          ? 'live'
          : meeting.scheduledAt
            ? 'scheduled'
            : 'draft',
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }

  // In meetings.service.ts
static async autoEndStaleMeetings() {
  const prisma = getPrisma();
  const staleThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
  
  const stale = await prisma.meeting.findMany({
    where: {
      startedAt: { lt: staleThreshold },
      endedAt: null,
    },
  });
  
  for (const m of stale) {
    await prisma.meeting.update({
      where: { id: m.id },
      data: { endedAt: new Date() },
    });
  }
  
  return stale.length;
}
}