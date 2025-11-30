import { prisma } from "./prisma";
import type { UserStatus } from "@prisma/client";

/**
 * Admin email that gets automatic admin status.
 * Set via ADMIN_EMAIL environment variable.
 * Falls back to michael.s.bergin@gmail.com for backwards compatibility.
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "michael.s.bergin@gmail.com";

export interface StackAuthUser {
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
}

export interface SyncedUser {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  createdAt: Date;
}

/**
 * Syncs a Stack Auth user to the local database
 * Creates new users with waitlist status (or admin if admin email)
 * Updates existing users' email and name
 */
export async function syncUserToDatabase(
  stackUser: StackAuthUser
): Promise<SyncedUser | null> {
  if (!stackUser.primaryEmail) {
    return null;
  }

  const isAdmin = stackUser.primaryEmail === ADMIN_EMAIL;

  const user = await prisma.user.upsert({
    where: { id: stackUser.id },
    update: {
      email: stackUser.primaryEmail,
      name: stackUser.displayName,
    },
    create: {
      id: stackUser.id,
      email: stackUser.primaryEmail,
      name: stackUser.displayName,
      status: isAdmin ? "admin" : "waitlist",
    },
  });

  return user;
}

/**
 * Gets a user from the database by Stack Auth ID
 */
export async function getUserById(
  stackAuthId: string
): Promise<SyncedUser | null> {
  return prisma.user.findUnique({
    where: { id: stackAuthId },
  });
}

/**
 * Checks if user has access to the main application
 * Users with 'user', 'userPro', or 'admin' status have access
 */
export function hasAppAccess(status: UserStatus): boolean {
  return status === "user" || status === "userPro" || status === "admin";
}

/**
 * Checks if user has admin access
 */
export function hasAdminAccess(status: UserStatus): boolean {
  return status === "admin";
}

