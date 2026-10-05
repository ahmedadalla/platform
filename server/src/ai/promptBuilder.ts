import { prisma } from '../prisma';

export interface CompanyBotContext {
  company: {
    id: string;
    name: string;
    currency: string;
    deliveryFee: number;
    minOrderAmount: number;
    aiSystemPrompt?: string | null;
  };
  categories: {
    name: string;
    items: {
      name: string;
      price: number;
      description?: string | null;
      isAvailable: boolean;
    }[];
  }[];
  knowledgeDocs: {
    title: string;
    fileType: string;
    rawText: string;
  }[];
}

export async function getCompanyBotContext(companyId: string): Promise<CompanyBotContext | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      categories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isAvailable: true },
          },
        },
      },
      documents: true,
    },
  });

  if (!company) return null;

  return {
    company: {
      id: company.id,
      name: company.name,
      currency: company.currency,
      deliveryFee: company.deliveryFee,
      minOrderAmount: company.minOrderAmount,
      aiSystemPrompt: company.aiSystemPrompt,
    },
    categories: company.categories.map(c => ({
      name: c.name,
      items: c.items.map(i => ({
        name: i.name,
        price: i.price,
        description: i.description,
        isAvailable: i.isAvailable,
      })),
    })),
    knowledgeDocs: company.documents.map(d => ({
      title: d.title,
      fileType: d.fileType,
      rawText: d.rawText,
    })),
  };
}

export function buildSystemPrompt(ctx: CompanyBotContext): string {
  const { company, categories, knowledgeDocs } = ctx;

  // Format Menu
  let menuSection = '=== LIVE MENU & PRICING / قائمة الطعام والأسعار ===\n';
  if (categories.length === 0) {
    menuSection += 'No items currently in menu. / القائمة فارغة حالياً.\n';
  } else {
    for (const cat of categories) {
      menuSection += `\n[Category / التصنيف: ${cat.name}]\n`;
      for (const item of cat.items) {
        menuSection += `- ${item.name}: ${company.currency}${item.price.toFixed(2)}${item.description ? ` (${item.description})` : ''}\n`;
      }
    }
  }

  // Format Knowledge Base
  let kbSection = '\n=== STORE KNOWLEDGE BASE (POLICIES, FAQS, HOURS) / معلومات المتجر والسياسات ===\n';
  if (knowledgeDocs.length === 0) {
    kbSection += 'No special knowledge base documents uploaded.\n';
  } else {
    for (const doc of knowledgeDocs) {
      kbSection += `\n--- Document: ${doc.title} (${doc.fileType.toUpperCase()}) ---\n${doc.rawText}\n`;
    }
  }

  const customInstructions = company.aiSystemPrompt ? `\nSPECIAL STORE INSTRUCTIONS:\n${company.aiSystemPrompt}\n` : '';

  return `You are the official smart AI WhatsApp assistant for "${company.name}".
You assist customers in managing orders, answering questions about the menu, delivery fees, working hours, and store policies.

🌟 LANGUAGE & ARABIC SUPPORT (STRICT MANDATORY RULE):
- YOU MUST ALWAYS REPLY IN THE EXACT SAME LANGUAGE USED BY THE CUSTOMER.
- IF THE CUSTOMER TYPES IN ARABIC (العربية) (e.g., "السلام عليكم", "مرحبا", "منيو", "قائمة الطعام", "اريد اطلب", "ابغى", "شنو عندكم"):
  * YOU MUST REPLY 100% IN NATURAL, POLITE, WELCOMING ARABIC (العربية)!
  * Greet warmly (e.g. "وعليكم السلام ورحمة الله وبركاته! أهلاً بك في ${company.name}، كيف أقدر أساعدك اليوم؟").
  * Present the menu neatly in Arabic with prices and currency (${company.currency}).
- IF THE CUSTOMER TYPES IN ENGLISH, reply in English.
- Handle typos and casual shorthand gracefully: "minue", "show minue", "menu", "منيو", "المنيو" all mean they want to see the menu!

DELIVERY & ORDERING RULES:
- Delivery Fee / رسوم التوصيل: ${company.currency}${company.deliveryFee.toFixed(2)} (Always mention this to the customer).
- Minimum Order Amount / الحد الأدنى للطلب: ${company.currency}${company.minOrderAmount.toFixed(2)}.
- Currency / العملة: ${company.currency}.
- When a customer wants to order:
  1. Confirm the items and quantities from the live menu.
  2. Ask for their delivery address and recipient name if not already provided.
  3. Provide a clear summary: Items, Subtotal, Delivery Fee (${company.currency}${company.deliveryFee.toFixed(2)}), and Grand Total.
  4. When the customer confirms, trigger the "create_order" tool immediately to send the ticket to the kitchen!

KNOWLEDGE BASE & FAQ RULES:
- Refer to the STORE KNOWLEDGE BASE for questions about working hours, return policies, payment options, allergy notes, or branch locations.
- If an answer is not in the menu or knowledge base, politely state that you do not have that information and offer to connect them with a human team member.
- Keep WhatsApp replies friendly, clean, beautifully formatted with emojis, and easy to read on mobile screens.

${menuSection}
${kbSection}
${customInstructions}
`;
}
