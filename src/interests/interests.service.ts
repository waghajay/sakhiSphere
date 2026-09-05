import { getPrisma } from '../config/database';
import { Prisma } from '@prisma/client';

export class InterestsService {
  /**
   * Retrieves all available interests.
   */
  static async getAllInterests() {
    const prisma = getPrisma();
    return prisma.interest.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Retrieves user's selected interests.
   */
  static async getUserInterests(userId: number) {
    const prisma = getPrisma();
    
    const userInterests = await prisma.userInterest.findMany({
      where: { userId },
      include: {
        interest: true,
      },
      orderBy: {
        interest: {
          category: 'asc',
        },
      },
    });

    return userInterests.map(ui => ui.interest);
  }

  /**
   * Sets user's interests.
   */
  static async setUserInterests(userId: number, interestIds: number[]) {
    const prisma = getPrisma();

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete existing interests
      await tx.userInterest.deleteMany({
        where: { userId },
      });

      // Add new interests
      if (interestIds.length > 0) {
        const uniqueIds = Array.from(new Set(interestIds));
        
        await tx.userInterest.createMany({
          data: uniqueIds.map(interestId => ({
            userId,
            interestId,
          })),
        });
      }
    });

    return this.getUserInterests(userId);
  }
}