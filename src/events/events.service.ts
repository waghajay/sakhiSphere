import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma, EventRsvpStatus } from '@prisma/client';

export interface CreateEventDto {
  title: string;
  description?: string;
  coverUrl?: string;
  startAt: string | Date;
  endAt?: string | Date | null;
  location?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
  capacity?: number | null;
  groupId?: number | null;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  coverUrl?: string;
  startAt?: string | Date;
  endAt?: string | Date | null;
  location?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
  capacity?: number | null;
}

export class EventsService {
  /**
   * Creates a new event.
   */
  static async createEvent(userId: number, data: CreateEventDto) {
    const prisma = getPrisma();

    // Validation
    if (!data.title || !data.title.trim()) {
      throw new CustomError('Event title is required', 400);
    }

    if (data.title.length > 200) {
      throw new CustomError('Title must be less than 200 characters', 400);
    }

    if (!data.startAt) {
      throw new CustomError('Event start date/time is required', 400);
    }

    const startAt = new Date(data.startAt);
    if (isNaN(startAt.getTime())) {
      throw new CustomError('Invalid start date/time', 400);
    }

    let endAt: Date | null = null;
    if (data.endAt) {
      endAt = new Date(data.endAt);
      if (isNaN(endAt.getTime())) {
        throw new CustomError('Invalid end date/time', 400);
      }
      if (endAt < startAt) {
        throw new CustomError('End date must be after start date', 400);
      }
    }

    if (data.capacity !== undefined && data.capacity !== null) {
      if (data.capacity < 1) {
        throw new CustomError('Capacity must be at least 1', 400);
      }
    }

    // If groupId provided, verify user is a member
    if (data.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: data.groupId, userId },
        },
      });
      if (!member) {
        throw new CustomError('You must be a member of the group to create events in it', 403);
      }
    }

    const event = await prisma.event.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        coverUrl: data.coverUrl || null,
        startAt,
        endAt,
        location: data.location?.trim() || null,
        isVirtual: data.isVirtual || false,
        meetingUrl: data.meetingUrl?.trim() || null,
        capacity: data.capacity ?? null,
        groupId: data.groupId || null,
        organizerId: userId,
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        group: { select: { id: true, name: true } },
        _count: {
          select: { rsvps: true },
        },
      },
    });

    // Auto-RSVP the organizer as "going"
    await prisma.eventRsvp.create({
      data: {
        eventId: event.id,
        userId,
        status: 'going',
      },
    });

    return this.formatEvent(event, userId);
  }

  /**
   * Gets list of events with filters.
   */
  static async getEvents(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      filter?: 'all' | 'upcoming' | 'past' | 'my' | 'going' | 'group';
      groupId?: number;
    } = {}
  ) {
    const prisma = getPrisma();
    const {
      page = 1,
      limit = 20,
      search,
      filter = 'upcoming',
      groupId,
    } = options;
    const skip = (page - 1) * limit;

    const now = new Date();
    const AND: Prisma.EventWhereInput[] = [];

    // Search
    if (search && search.trim()) {
      AND.push({
        OR: [
          { title: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { location: { contains: search.trim(), mode: 'insensitive' } },
        ],
      });
    }

    // Group scoping
    if (groupId) {
      AND.push({ groupId });
    }

    // Filter
    switch (filter) {
      case 'upcoming':
        AND.push({ startAt: { gte: now } });
        break;
      case 'past':
        AND.push({ startAt: { lt: now } });
        break;
      case 'my':
        AND.push({ organizerId: userId });
        break;
      case 'going':
        AND.push({
          rsvps: { some: { userId, status: 'going' } },
        });
        break;
      case 'all':
      default:
        // no time filter
        break;
    }

    const where: Prisma.EventWhereInput = AND.length > 0 ? { AND } : {};

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          group: { select: { id: true, name: true } },
          rsvps: {
            where: { userId },
            select: { status: true },
          },
          _count: {
            select: { rsvps: true },
          },
        },
        orderBy: [
          { startAt: filter === 'past' ? 'desc' : 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Get going counts (accurate, excludes not_going)
    const eventIds = events.map(e => e.id);
    const goingCounts = eventIds.length > 0
      ? await prisma.eventRsvp.groupBy({
          by: ['eventId'],
          where: {
            eventId: { in: eventIds },
            status: 'going',
          },
          _count: { _all: true },
        })
      : [];

    const goingMap = new Map(
      goingCounts.map(g => [g.eventId, g._count._all])
    );

    return {
      events: events.map(e => this.formatEvent(e, userId, goingMap.get(e.id) || 0)),
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
   * Gets a single event by ID.
   */
  static async getEvent(eventId: number, userId?: number) {
    const prisma = getPrisma();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true, bio: true } },
          },
        },
        group: { select: { id: true, name: true, privacy: true } },
        rsvps: userId
          ? {
              where: { userId },
              select: { status: true },
            }
          : false,
        _count: { select: { rsvps: true } },
      },
    });

    if (!event) {
      throw new CustomError('Event not found', 404);
    }

    const goingCount = await prisma.eventRsvp.count({
      where: { eventId, status: 'going' },
    });

    return this.formatEvent(event, userId, goingCount);
  }

  /**
   * Updates an event. Only the organizer.
   */
  static async updateEvent(eventId: number, userId: number, data: UpdateEventDto) {
    const prisma = getPrisma();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new CustomError('Event not found', 404);
    }

    if (event.organizerId !== userId) {
      throw new CustomError('Only the organizer can edit this event', 403);
    }

    const updateData: Prisma.EventUpdateInput = {};

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new CustomError('Title cannot be empty', 400);
      }
      updateData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.location !== undefined) updateData.location = data.location?.trim() || null;
    if (data.isVirtual !== undefined) updateData.isVirtual = data.isVirtual;
    if (data.meetingUrl !== undefined) updateData.meetingUrl = data.meetingUrl?.trim() || null;

    if (data.capacity !== undefined) {
      if (data.capacity !== null && data.capacity < 1) {
        throw new CustomError('Capacity must be at least 1', 400);
      }
      updateData.capacity = data.capacity;
    }

    if (data.startAt !== undefined) {
      const startAt = new Date(data.startAt);
      if (isNaN(startAt.getTime())) {
        throw new CustomError('Invalid start date/time', 400);
      }
      updateData.startAt = startAt;
    }

    if (data.endAt !== undefined) {
      if (data.endAt === null) {
        updateData.endAt = null;
      } else {
        const endAt = new Date(data.endAt);
        if (isNaN(endAt.getTime())) {
          throw new CustomError('Invalid end date/time', 400);
        }
        updateData.endAt = endAt;
      }
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        group: { select: { id: true, name: true } },
        rsvps: { where: { userId }, select: { status: true } },
        _count: { select: { rsvps: true } },
      },
    });

    const goingCount = await prisma.eventRsvp.count({
      where: { eventId, status: 'going' },
    });

    return this.formatEvent(updated, userId, goingCount);
  }

  /**
   * Deletes an event. Only the organizer.
   */
  static async deleteEvent(eventId: number, userId: number) {
    const prisma = getPrisma();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new CustomError('Event not found', 404);
    }

    if (event.organizerId !== userId) {
      throw new CustomError('Only the organizer can delete this event', 403);
    }

    await prisma.event.delete({ where: { id: eventId } });

    return { success: true, message: 'Event deleted successfully' };
  }

  /**
   * RSVP to an event (going / maybe / not_going).
   */
  static async rsvpEvent(
    eventId: number,
    userId: number,
    status: EventRsvpStatus
  ) {
    const prisma = getPrisma();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new CustomError('Event not found', 404);
    }

    // Capacity check for 'going'
    if (status === 'going' && event.capacity) {
      const existing = await prisma.eventRsvp.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });

      const isNewGoing = !existing || existing.status !== 'going';

      if (isNewGoing) {
        const goingCount = await prisma.eventRsvp.count({
          where: { eventId, status: 'going' },
        });

        if (goingCount >= event.capacity) {
          throw new CustomError('Event is at full capacity', 400);
        }
      }
    }

    const rsvp = await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status },
      update: { status },
    });

    const goingCount = await prisma.eventRsvp.count({
      where: { eventId, status: 'going' },
    });

    return {
      success: true,
      message: `RSVP updated to ${status}`,
      data: {
        status: rsvp.status,
        goingCount,
      },
    };
  }

  /**
   * Removes RSVP from an event.
   */
  static async cancelRsvp(eventId: number, userId: number) {
    const prisma = getPrisma();

    const existing = await prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!existing) {
      throw new CustomError('You have not RSVP\'d to this event', 400);
    }

    await prisma.eventRsvp.delete({
      where: { eventId_userId: { eventId, userId } },
    });

    const goingCount = await prisma.eventRsvp.count({
      where: { eventId, status: 'going' },
    });

    return {
      success: true,
      message: 'RSVP removed',
      data: { goingCount },
    };
  }

  /**
   * Gets RSVPs for an event with pagination (attendees list).
   */
  static async getEventAttendees(
    eventId: number,
    statusFilter: EventRsvpStatus = 'going',
    page: number = 1,
    limit: number = 20
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const where: Prisma.EventRsvpWhereInput = {
      eventId,
      status: statusFilter,
    };

    const [rsvps, total] = await Promise.all([
      prisma.eventRsvp.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: {
                select: { avatarUrl: true, bio: true, location: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.eventRsvp.count({ where }),
    ]);

    return {
      attendees: rsvps.map(r => ({
        id: r.user.id,
        name: r.user.name,
        isVerified: r.user.isVerified,
        avatarUrl: r.user.profile?.avatarUrl || null,
        bio: r.user.profile?.bio || null,
        location: r.user.profile?.location || null,
        status: r.status,
        rsvpAt: r.createdAt,
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
   * Helper to format event.
   */
  private static formatEvent(event: any, userId?: number, goingCount?: number) {
    const myRsvp =
      event.rsvps && event.rsvps.length > 0 ? event.rsvps[0].status : null;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      coverUrl: event.coverUrl,
      startAt: event.startAt,
      endAt: event.endAt,
      location: event.location,
      isVirtual: event.isVirtual,
      meetingUrl: event.meetingUrl,
      capacity: event.capacity,
      organizer: event.organizer
        ? {
            id: event.organizer.id,
            name: event.organizer.name,
            isVerified: event.organizer.isVerified,
            avatarUrl: event.organizer.profile?.avatarUrl || null,
          }
        : null,
      group: event.group
        ? { id: event.group.id, name: event.group.name }
        : null,
      goingCount: goingCount ?? event._count?.rsvps ?? 0,
      myRsvp,
      isOrganizer: event.organizerId === userId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}