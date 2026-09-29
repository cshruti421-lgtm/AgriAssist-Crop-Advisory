import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetFarmResponse, UpsertFarmBody, UpsertFarmResponse } from "@workspace/api-zod";
import { db, farmsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { ensureUser } from "../lib/user";

const router: IRouter = Router();

function toFarm(farm: typeof farmsTable.$inferSelect) {
  return {
    id: farm.id,
    location: farm.location,
    primaryCrops: farm.primaryCrops,
    farmSizeHectares:
      farm.farmSizeHectares === null ? null : Number(farm.farmSizeHectares),
    createdAt: farm.createdAt,
  };
}

router.get("/farm", requireAuth, async (req, res): Promise<void> => {
  const user = await ensureUser(req);
  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.userId, user.id));
  res.json(GetFarmResponse.parse(farm ? toFarm(farm) : null));
});

router.put("/farm", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpsertFarmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await ensureUser(req);
  const [farm] = await db
    .insert(farmsTable)
    .values({
      userId: user.id,
      location: parsed.data.location,
      primaryCrops: parsed.data.primaryCrops,
      farmSizeHectares:
        parsed.data.farmSizeHectares == null
          ? null
          : String(parsed.data.farmSizeHectares),
    })
    .onConflictDoUpdate({
      target: farmsTable.userId,
      set: {
        location: parsed.data.location,
        primaryCrops: parsed.data.primaryCrops,
        farmSizeHectares:
          parsed.data.farmSizeHectares == null
            ? null
            : String(parsed.data.farmSizeHectares),
      },
    })
    .returning();

  res.json(UpsertFarmResponse.parse(toFarm(farm)));
});

export default router;