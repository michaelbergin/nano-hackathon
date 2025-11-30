import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAdminAccess } from "@/lib/userSync";
import type { UserStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES: UserStatus[] = ["waitlist", "user", "userPro", "admin"];

/**
 * PATCH /api/admin/users/[id]
 * Updates a user's status (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // Check authentication
    const stackUser = await stackServerApp.getUser();
    if (!stackUser || !stackUser.primaryEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync and check admin status
    const adminUser = await syncUserToDatabase({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
    });

    if (!adminUser || !hasAdminAccess(adminUser.status)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = (await req.json()) as { status?: string };
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status as UserStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: waitlist, user, userPro, admin" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from removing their own admin status
    if (id === adminUser.id && status !== "admin") {
      return NextResponse.json(
        { error: "Cannot remove your own admin status" },
        { status: 400 }
      );
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: status as UserStatus },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/[id]
 * Gets a single user by ID (admin only)
 */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // Check authentication
    const stackUser = await stackServerApp.getUser();
    if (!stackUser || !stackUser.primaryEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync and check admin status
    const adminUser = await syncUserToDatabase({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
    });

    if (!adminUser || !hasAdminAccess(adminUser.status)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

