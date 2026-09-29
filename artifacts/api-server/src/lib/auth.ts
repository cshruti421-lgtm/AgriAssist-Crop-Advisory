import { getAuth } from "@clerk/express";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export type AuthenticatedRequest = Request & { userId: string };

export const requireAuth: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  const claims = auth as unknown as {
    userId?: string;
    sessionClaims?: { sub?: string };
  };
  const userId = claims.userId ?? claims.sessionClaims?.sub;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  (req as AuthenticatedRequest).userId = userId;
  next();
};

export function getUserId(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

export function getClerkClaims(req: Request): {
  email?: string;
  name?: string;
  fullName?: string;
} {
  const auth = getAuth(req);
  const claims = auth.sessionClaims as
    | { email?: string; name?: string; fullName?: string }
    | undefined;
  return claims ?? {};
}