import { Router, type IRouter } from "express";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { ensureUser } from "../lib/user";

const router: IRouter = Router();

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = await ensureUser(req);
  res.json(
    GetCurrentUserResponse.parse({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      location: user.location,
    }),
  );
});

export default router;