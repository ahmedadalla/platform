import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { prisma } from '../../prisma';
import { authenticateJWT, requireCompany } from '../../middleware/auth';
import { config } from '../../config';

const router = Router();
router.use(authenticateJWT);
router.use(requireCompany);

// Ensure upload directory exists
const uploadDir = path.join(config.uploadsDir, 'knowledge');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs, images (PNG, JPG, WEBP), and TXT files are allowed'));
    }
  },
});

// List knowledge documents
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const docs = await prisma.knowledgeDoc.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(docs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch knowledge documents' });
  }
});

// Upload and parse document (PDF / Image / TXT)
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const file = req.file;
    const title = req.body.title || file?.originalname || 'Uploaded Document';

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let fileType = 'pdf';
    let extractedText = '';

    if (ext === '.pdf') {
      fileType = 'pdf';
      const fileBuffer = fs.readFileSync(file.path);
      const parsed = await pdfParse(fileBuffer);
      extractedText = parsed.text || '';
    } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      fileType = 'image';
      extractedText = `[Image Knowledge Asset: ${file.originalname}]\nUploaded image reference containing visual menu, promotional poster or store policies.`;
    } else {
      fileType = 'text';
      extractedText = fs.readFileSync(file.path, 'utf8');
    }

    if (!extractedText.trim()) {
      extractedText = `Document: ${file.originalname} (Uploaded on ${new Date().toLocaleDateString()})`;
    }

    const doc = await prisma.knowledgeDoc.create({
      data: {
        companyId,
        title,
        fileType,
        fileUrl: `/uploads/knowledge/${file.filename}`,
        rawText: extractedText.trim(),
      },
    });

    return res.status(201).json({
      message: 'Document uploaded and indexed into AI Knowledge Base',
      document: doc,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process document upload' });
  }
});

// Add manual FAQ / Store policy directly
router.post('/faq', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { title, rawText } = req.body;

    if (!title || !rawText) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const doc = await prisma.knowledgeDoc.create({
      data: {
        companyId,
        title,
        fileType: 'faq',
        rawText: rawText.trim(),
      },
    });

    return res.status(201).json({
      message: 'FAQ policy saved to Knowledge Base',
      document: doc,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create FAQ policy' });
  }
});

// Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    const doc = await prisma.knowledgeDoc.findFirst({
      where: { id, companyId },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Try deleting physical file if it exists
    if (doc.fileUrl) {
      const filename = path.basename(doc.fileUrl);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await prisma.knowledgeDoc.delete({
      where: { id },
    });

    return res.json({ message: 'Document removed from Knowledge Base' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
