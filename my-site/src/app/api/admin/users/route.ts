import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAdminAccess } from "@/lib/userSync";

/**
 * GET /api/admin/users
 * Lists all users with pagination (admin only)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const stackUser = await stackServerApp.getUser();
    if (!stackUser || !stackUser.primaryEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync and check admin status
    const dbUser = await syncUserToDatabase({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
    });

    if (!dbUser || !hasAdminAccess(dbUser.status)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const search = searchParams.get("search") ?? "";
    const statusFilter = searchParams.get("status") ?? "";

    // Build where clause
    const where: {
      email?: { contains: string; mode: "insensitive" };
      status?: "waitlist" | "user" | "userPro" | "admin";
    } = {};

    if (search) {
      where.email = { contains: search, mode: "insensitive" };
    }

    if (statusFilter && ["waitlist", "user", "userPro", "admin"].includes(statusFilter)) {
      where.status = statusFilter as "waitlist" | "user" | "userPro" | "admin";
    }

    // Fetch users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

