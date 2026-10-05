import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { authenticateJWT, requireCompany } from '../../middleware/auth';

const router = Router();
router.use(authenticateJWT);
router.use(requireCompany);

// Get full menu catalog
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const categories = await prisma.menuCategory.findMany({
      where: { companyId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { name: 'asc' },
        },
      },
    });
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Create Category
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { name, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const category = await prisma.menuCategory.create({
      data: {
        companyId,
        name,
        sortOrder: sortOrder || 0,
      },
    });
    return res.status(201).json(category);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update Category
router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;
    const { name, sortOrder } = req.body;

    const updated = await prisma.menuCategory.updateMany({
      where: { id: id as string, companyId },
      data: {
        name: name !== undefined ? name : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      },
    });

    return res.json({ message: 'Category updated', updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete Category
router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    await prisma.menuCategory.deleteMany({
      where: { id: id as string, companyId },
    });

    return res.json({ message: 'Category deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Create Menu Item
router.post('/items', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { categoryId, name, description, price, imageUrl, isAvailable } = req.body;

    if (!categoryId || !name || price === undefined) {
      return res.status(400).json({ error: 'Category, Name, and Price are required' });
    }

    // Verify category belongs to this company
    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, companyId },
    });
    if (!category) return res.status(400).json({ error: 'Invalid category' });

    const item = await prisma.menuItem.create({
      data: {
        companyId,
        categoryId,
        name,
        description: description || null,
        price: parseFloat(price),
        imageUrl: imageUrl || null,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      },
    });

    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update Menu Item
router.put('/items/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;
    const { categoryId, name, description, price, imageUrl, isAvailable } = req.body;

    const updated = await prisma.menuItem.updateMany({
      where: { id: id as string, companyId },
      data: {
        categoryId: categoryId || undefined,
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        isAvailable: isAvailable !== undefined ? isAvailable : undefined,
      },
    });

    return res.json({ message: 'Item updated', updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update item' });
  }
});

// Toggle Item Availability (In Stock / Out of Stock)
router.patch('/items/:id/toggle', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    const item = await prisma.menuItem.findFirst({
      where: { id: id as string, companyId },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const updated = await prisma.menuItem.update({
      where: { id: id as string },
      data: { isAvailable: !item.isAvailable },
    });

    return res.json({ message: 'Availability toggled', isAvailable: updated.isAvailable });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// Delete Menu Item
router.delete('/items/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    await prisma.menuItem.deleteMany({
      where: { id: id as string, companyId },
    });

    return res.json({ message: 'Item deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
