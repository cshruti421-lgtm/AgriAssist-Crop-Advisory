import { and, count, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod/v4";
import {
  CreateMarketAdvisoryBody,
  CreateMarketAdvisoryResponse,
  CreateWeatherAdvisoryBody,
  CreateWeatherAdvisoryResponse,
  ListAdvisoriesQueryParams,
  ListAdvisoriesResponse,
  CreateDiseaseAdvisoryResponse,
} from "@workspace/api-zod";
import { advisoriesTable, db } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { ensureUser } from "../lib/user";
import {
  generateDiseaseAdvice,
  generateMarketAdvice,
  generateWeatherAdvice,
} from "../lib/gemini";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(
      null,
      ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
    );
  },
});
const advisoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many advisory requests. Please try again later." },
});

const diseaseInputSchema = z.object({
  cropType: z.string().min(2),
  symptomsOnset: z.coerce.number().int().min(0),
  imagePath: z.string().optional(),
});

function toAdvisory(advisory: typeof advisoriesTable.$inferSelect) {
  return {
    id: advisory.id,
    category: advisory.category,
    cropType: advisory.cropType,
    userInputs: advisory.userInputs,
    aiResponse: advisory.aiResponse,
    imageUrl: advisory.imageUrl,
    createdAt: advisory.createdAt,
  };
}

router.get("/advisories", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAdvisoriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await ensureUser(req);
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 10;
  const conditions = [eq(advisoriesTable.userId, user.id)];
  if (parsed.data.category) {
    conditions.push(eq(advisoriesTable.category, parsed.data.category));
  }

  const [totalRow] = await db
    .select({ total: count() })
    .from(advisoriesTable)
    .where(and(...conditions));
  const rows = await db
    .select()
    .from(advisoriesTable)
    .where(and(...conditions))
    .orderBy(desc(advisoriesTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const total = Number(totalRow?.total ?? 0);

  res.json(
    ListAdvisoriesResponse.parse({
      items: rows.map(toAdvisory),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }),
  );
});

router.post(
  "/advisory/disease",
  requireAuth,
  advisoryLimiter,
  upload.single("image"),
  async (req, res): Promise<void> => {
    const parsed = diseaseInputSchema.safeParse(req.body);
    if (!parsed.success || !req.file) {
      res.status(400).json({ error: "Crop type, symptom onset, and an image are required." });
      return;
    }

    try {
      const result = await generateDiseaseAdvice(
        parsed.data.cropType,
        parsed.data.symptomsOnset,
        {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      );
      const user = await ensureUser(req);
      const [advisory] = await db
        .insert(advisoriesTable)
        .values({
          userId: user.id,
          category: "disease",
          cropType: parsed.data.cropType,
          userInputs: {
            cropType: parsed.data.cropType,
            symptomsOnset: parsed.data.symptomsOnset,
            imageName: req.file.originalname,
          },
          aiResponse: result,
          imageUrl: parsed.data.imagePath
            ? `/api/storage${parsed.data.imagePath}`
            : null,
        })
        .returning();
      res.status(201).json(CreateDiseaseAdvisoryResponse.parse(toAdvisory(advisory)));
    } catch (error) {
      req.log.error({ err: error }, "Disease advisory generation failed");
      res.status(502).json({ error: "Unable to generate disease advice right now." });
    }
  },
);

router.post(
  "/advisory/weather",
  requireAuth,
  advisoryLimiter,
  async (req, res): Promise<void> => {
    const parsed = CreateWeatherAdvisoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    try {
      const result = await generateWeatherAdvice(
        parsed.data.cropType,
        parsed.data.growthStage,
        parsed.data.weatherEvent,
      );
      const user = await ensureUser(req);
      const [advisory] = await db
        .insert(advisoriesTable)
        .values({
          userId: user.id,
          category: "weather",
          cropType: parsed.data.cropType,
          userInputs: parsed.data,
          aiResponse: result,
        })
        .returning();
      res.status(201).json(CreateWeatherAdvisoryResponse.parse(toAdvisory(advisory)));
    } catch (error) {
      req.log.error({ err: error }, "Weather advisory generation failed");
      res.status(502).json({ error: "Unable to generate weather advice right now." });
    }
  },
);

router.post(
  "/advisory/market",
  requireAuth,
  advisoryLimiter,
  async (req, res): Promise<void> => {
    const parsed = CreateMarketAdvisoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    try {
      const result = await generateMarketAdvice(
        parsed.data.cropType,
        parsed.data.estimatedYieldKg,
        parsed.data.currentLocalPricePerKg,
        parsed.data.storageAvailability,
      );
      const user = await ensureUser(req);
      const [advisory] = await db
        .insert(advisoriesTable)
        .values({
          userId: user.id,
          category: "market",
          cropType: parsed.data.cropType,
          userInputs: parsed.data,
          aiResponse: result,
        })
        .returning();
      res.status(201).json(CreateMarketAdvisoryResponse.parse(toAdvisory(advisory)));
    } catch (error) {
      req.log.error({ err: error }, "Market advisory generation failed");
      res.status(502).json({ error: "Unable to generate market advice right now." });
    }
  },
);

export default router;