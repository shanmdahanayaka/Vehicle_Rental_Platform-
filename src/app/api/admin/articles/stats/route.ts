import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { blogConfig } from "@/config/site";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN", "MANAGER"];

async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/articles/stats - Get article statistics
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalCount,
      newsCount,
      travelTipsCount,
      promotionCount,
      featuredCount,
      publishedCount,
      draftCount,
      archivedCount,
      totalViews,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { type: "NEWS" } }),
      prisma.article.count({ where: { type: "TRAVEL_TIPS" } }),
      prisma.article.count({ where: { type: "PROMOTION" } }),
      prisma.article.count({ where: { isFeatured: true } }),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.article.count({ where: { status: "DRAFT" } }),
      prisma.article.count({ where: { status: "ARCHIVED" } }),
      prisma.article.aggregate({ _sum: { viewCount: true } }),
    ]);

    return NextResponse.json({
      counts: {
        total: totalCount,
        byType: {
          NEWS: newsCount,
          TRAVEL_TIPS: travelTipsCount,
          PROMOTION: promotionCount,
        },
        byStatus: {
          PUBLISHED: publishedCount,
          DRAFT: draftCount,
          ARCHIVED: archivedCount,
        },
        featured: featuredCount,
      },
      limits: {
        maxArticles: blogConfig.maxArticles,
        maxArticlesPerType: blogConfig.maxArticlesPerType,
        maxFeaturedArticles: blogConfig.maxFeaturedArticles,
        maxImagesPerArticle: blogConfig.maxImagesPerArticle,
      },
      remaining: {
        total: blogConfig.maxArticles - totalCount,
        byType: {
          NEWS: blogConfig.maxArticlesPerType.NEWS - newsCount,
          TRAVEL_TIPS: blogConfig.maxArticlesPerType.TRAVEL_TIPS - travelTipsCount,
          PROMOTION: blogConfig.maxArticlesPerType.PROMOTION - promotionCount,
        },
        featured: blogConfig.maxFeaturedArticles - featuredCount,
      },
      totalViews: totalViews._sum.viewCount || 0,
    });
  } catch (error) {
    console.error("Error fetching article stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch article stats" },
      { status: 500 }
    );
  }
}
