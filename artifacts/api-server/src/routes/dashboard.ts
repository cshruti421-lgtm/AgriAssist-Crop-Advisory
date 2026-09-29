import { count, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { db, advisoriesTable, farmsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { ensureUser } from "../lib/user";

const router: IRouter = Router();

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

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = await ensureUser(req);
  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.userId, user.id));
  const grouped = await db
    .select({ category: advisoriesTable.category, total: count() })
    .from(advisoriesTable)
    .where(eq(advisoriesTable.userId, user.id))
    .groupBy(advisoriesTable.category);
  const recent = await db
    .select()
    .from(advisoriesTable)
    .where(eq(advisoriesTable.userId, user.id))
    .orderBy(desc(advisoriesTable.createdAt))
    .limit(5);

  const categoryCounts = { disease: 0, weather: 0, market: 0 };
  for (const row of grouped) {
    if (row.category === "disease" || row.category === "weather" || row.category === "market") {
      categoryCounts[row.category] = Number(row.total);
    }
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        location: user.location,
      },
      farm: farm
        ? {
            id: farm.id,
            location: farm.location,
            primaryCrops: farm.primaryCrops,
            farmSizeHectares:
              farm.farmSizeHectares === null ? null : Number(farm.farmSizeHectares),
            createdAt: farm.createdAt,
          }
        : null,
      totalAdvisories: categoryCounts.disease + categoryCounts.weather + categoryCounts.market,
      categoryCounts,
      recentAdvisories: recent.map(toAdvisory),
    }),
  );
});

export default router;