import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial platform data...');

  const passwordHash = await bcrypt.hash('admin123', 10);
  const ownerPasswordHash = await bcrypt.hash('owner123', 10);

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@platform.com' },
    update: {},
    create: {
      email: 'admin@platform.com',
      passwordHash,
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Super Admin created:', superAdmin.email);

  // 2. Sample Company: Bella Roma
  let bellaRoma = await prisma.company.findUnique({
    where: { slug: 'bella-roma' },
  });

  if (!bellaRoma) {
    bellaRoma = await prisma.company.create({
      data: {
        name: 'Bella Roma Italian Bistro',
        slug: 'bella-roma',
        phone: '+1 (555) 234-5678',
        currency: '$',
        deliveryFee: 3.50,
        minOrderAmount: 12.00,
        aiProvider: 'gemini',
        aiModel: 'gemini-1.5-flash',
        aiSystemPrompt: 'Always mention our homemade garlic bread recommendation when asked about appetizers.',
        isActive: true,
      },
    });

    // Create Company Admin User
    await prisma.user.create({
      data: {
        email: 'owner@bellaroma.com',
        passwordHash: ownerPasswordHash,
        name: 'Marco Rossi',
        role: 'COMPANY_ADMIN',
        companyId: bellaRoma.id,
      },
    });

    // Menu Categories & Items
    const pizzaCat = await prisma.menuCategory.create({
      data: {
        companyId: bellaRoma.id,
        name: 'Artisan Pizzas',
        sortOrder: 1,
      },
    });

    await prisma.menuItem.createMany({
      data: [
        {
          companyId: bellaRoma.id,
          categoryId: pizzaCat.id,
          name: 'Margherita Pizza',
          description: 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, extra virgin olive oil',
          price: 12.99,
          isAvailable: true,
        },
        {
          companyId: bellaRoma.id,
          categoryId: pizzaCat.id,
          name: 'Pepperoni Feast',
          description: 'Spicy Italian pepperoni, mozzarella cheese, crushed red pepper flakes',
          price: 15.49,
          isAvailable: true,
        },
        {
          companyId: bellaRoma.id,
          categoryId: pizzaCat.id,
          name: 'Truffle Wild Mushroom',
          description: 'Wild forest mushrooms, white truffle oil, fontina cheese, thyme',
          price: 17.99,
          isAvailable: true,
        },
      ],
    });

    const pastaCat = await prisma.menuCategory.create({
      data: {
        companyId: bellaRoma.id,
        name: 'Handcrafted Pastas',
        sortOrder: 2,
      },
    });

    await prisma.menuItem.createMany({
      data: [
        {
          companyId: bellaRoma.id,
          categoryId: pastaCat.id,
          name: 'Creamy Fettuccine Alfredo',
          description: 'Parmigiano-Reggiano cream sauce, garlic, Italian parsley',
          price: 14.50,
          isAvailable: true,
        },
        {
          companyId: bellaRoma.id,
          categoryId: pastaCat.id,
          name: 'Spaghetti Bolognese',
          description: 'Slow-simmered beef and herb ragù topped with aged parmesan',
          price: 13.99,
          isAvailable: true,
        },
      ],
    });

    const dessertCat = await prisma.menuCategory.create({
      data: {
        companyId: bellaRoma.id,
        name: 'Desserts & Beverages',
        sortOrder: 3,
      },
    });

    await prisma.menuItem.createMany({
      data: [
        {
          companyId: bellaRoma.id,
          categoryId: dessertCat.id,
          name: 'Classic Venetian Tiramisu',
          description: 'Espresso-soaked ladyfingers, mascarpone cream, dark cocoa powder',
          price: 7.50,
          isAvailable: true,
        },
        {
          companyId: bellaRoma.id,
          categoryId: dessertCat.id,
          name: 'Blood Orange Italian Soda',
          description: 'Sparkling San Pellegrino with Sicilian blood orange essence',
          price: 3.50,
          isAvailable: true,
        },
      ],
    });

    // Sample Knowledge Base Document
    await prisma.knowledgeDoc.create({
      data: {
        companyId: bellaRoma.id,
        title: 'Working Hours & Delivery Policy',
        fileType: 'faq',
        rawText: `STORE HOURS:
Monday to Thursday: 11:30 AM - 10:30 PM
Friday to Sunday: 11:30 AM - 11:30 PM

DELIVERY POLICY:
- We deliver within an 8-mile radius.
- Standard delivery time is 30 to 45 minutes.
- Payment methods accepted: Cash on Delivery, Apple Pay, Visa, Mastercard.
- Free breadsticks included with orders over $35.

ALLERGENS & DIETARY:
- Gluten-free pizza crust available upon request (+$3.00).
- Halal meat options are available for chicken and beef bolognese.`,
      },
    });

    // Sample Orders for Live Order Board Demo
    const sampleOrder1 = await prisma.order.create({
      data: {
        companyId: bellaRoma.id,
        orderNumber: 1001,
        customerName: 'Sarah Jenkins',
        customerPhone: '+14155552671',
        deliveryAddress: '742 Evergreen Terrace, Apt 4B',
        notes: 'Please ring the doorbell twice',
        subtotal: 28.48,
        deliveryFee: 3.50,
        total: 31.98,
        status: 'PENDING',
        items: {
          create: [
            { name: 'Margherita Pizza', quantity: 1, price: 12.99 },
            { name: 'Pepperoni Feast', quantity: 1, price: 15.49 },
          ],
        },
      },
    });

    const sampleOrder2 = await prisma.order.create({
      data: {
        companyId: bellaRoma.id,
        orderNumber: 1002,
        customerName: 'Michael Chang',
        customerPhone: '+14155558912',
        deliveryAddress: '100 Market St, Suite 210',
        notes: 'Extra parmesan on the side please',
        subtotal: 22.00,
        deliveryFee: 3.50,
        total: 25.50,
        status: 'IN_KITCHEN',
        items: {
          create: [
            { name: 'Creamy Fettuccine Alfredo', quantity: 1, price: 14.50 },
            { name: 'Classic Venetian Tiramisu', quantity: 1, price: 7.50 },
          ],
        },
      },
    });

    const sampleOrder3 = await prisma.order.create({
      data: {
        companyId: bellaRoma.id,
        orderNumber: 1003,
        customerName: 'Elena Rostova',
        customerPhone: '+14155554321',
        deliveryAddress: '450 Pine Ave',
        notes: 'Leave at front porch',
        subtotal: 17.99,
        deliveryFee: 3.50,
        total: 21.49,
        status: 'OUT_FOR_DELIVERY',
        items: {
          create: [
            { name: 'Truffle Wild Mushroom', quantity: 1, price: 17.99 },
          ],
        },
      },
    });

    console.log('Sample company Bella Roma and orders seeded.');
  }

  // 3. Sample Company 2: Tokyo Ramen Bar
  let tokyoRamen = await prisma.company.findUnique({
    where: { slug: 'tokyo-ramen' },
  });

  if (!tokyoRamen) {
    tokyoRamen = await prisma.company.create({
      data: {
        name: 'Tokyo Ramen Bar',
        slug: 'tokyo-ramen',
        phone: '+1 (555) 987-6543',
        currency: '$',
        deliveryFee: 4.00,
        minOrderAmount: 15.00,
        aiProvider: 'gemini',
        aiModel: 'gemini-1.5-flash',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'owner@tokyoramen.com',
        passwordHash: ownerPasswordHash,
        name: 'Kenji Sato',
        role: 'COMPANY_ADMIN',
        companyId: tokyoRamen.id,
      },
    });
    console.log('Sample company Tokyo Ramen seeded.');
  }

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
