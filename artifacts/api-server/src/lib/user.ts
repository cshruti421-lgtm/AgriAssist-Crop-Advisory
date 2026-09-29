import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import type { Request } from "express";
import { getClerkClaims, getUserId } from "./auth";

export async function ensureUser(req: Request) {
  const id = getUserId(req);
  const claims = getClerkClaims(req);
  const email = claims.email ?? `${id}@clerk.local`;
  const fullName = claims.fullName ?? claims.name ?? "Farmer";

  await db
    .insert(usersTable)
    .values({ id, email, fullName })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { email, fullName },
    });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    throw new Error("Unable to create user profile");
  }
  return user;
}