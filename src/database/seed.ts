import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInterests() {
  const interests = [
    // Arts & Culture
    { name: 'Reading & Books', category: 'Arts & Culture', icon: '📚' },
    { name: 'Art & Painting', category: 'Arts & Culture', icon: '🎨' },
    { name: 'Writing & Poetry', category: 'Arts & Culture', icon: '✍️' },
    { name: 'Music & Singing', category: 'Arts & Culture', icon: '🎵' },
    { name: 'Photography', category: 'Arts & Culture', icon: '📸' },
    // Lifestyle & Wellness
    { name: 'Yoga & Meditation', category: 'Lifestyle & Wellness', icon: '🧘‍♀️' },
    { name: 'Fitness & Gym', category: 'Lifestyle & Wellness', icon: '💪' },
    { name: 'Mental Wellness', category: 'Lifestyle & Wellness', icon: '🌱' },
    { name: 'Healthy Cooking', category: 'Lifestyle & Wellness', icon: '🥗' },
    { name: 'Baking & Desserts', category: 'Lifestyle & Wellness', icon: '🧁' },
    // Career & Tech
    { name: 'Technology & Coding', category: 'Career & Tech', icon: '💻' },
    { name: 'Entrepreneurship', category: 'Career & Tech', icon: '🚀' },
    { name: 'Career Mentorship', category: 'Career & Tech', icon: '💼' },
    { name: 'Finance & Investing', category: 'Career & Tech', icon: '💰' },
    // Hobbies & Exploring
    { name: 'Travel & Exploring', category: 'Hobbies & Exploring', icon: '✈️' },
    { name: 'Gardening & Plants', category: 'Hobbies & Exploring', icon: '🪴' },
    { name: 'Fashion & Styling', category: 'Hobbies & Exploring', icon: '👗' },
    { name: 'Movies & Drama', category: 'Hobbies & Exploring', icon: '🎬' },
    { name: 'DIY & Crafts', category: 'Hobbies & Exploring', icon: '✂️' },
    { name: 'Pet Care', category: 'Hobbies & Exploring', icon: '🐾' },
  ];

  console.log('🌱 Seeding interests...');
  
  for (const interest of interests) {
    await prisma.interest.upsert({
      where: { name: interest.name },
      update: {},
      create: interest,
    });
  }

  console.log('✅ Seeded 20 interests');
}

async function main() {
  try {
    await seedInterests();
    console.log('🎉 Database seeding completed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();