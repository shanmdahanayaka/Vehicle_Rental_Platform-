import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ArticleType, ArticleStatus } from "@prisma/client";
import { blogConfig, calculateReadingTime, generateSlug } from "@/config/site";

// Roles that can manage articles
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN", "MANAGER"];

// Helper to get user's actual role from database
async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/articles - List all articles
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ArticleType | null;
    const status = searchParams.get("status") as ArticleStatus | null;
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    if (featured === "true") {
      where.isFeatured = true;
    } else if (featured === "false") {
      where.isFeatured = false;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    // Parse JSON fields
    const formattedArticles = articles.map((article) => ({
      ...article,
      images: article.images ? JSON.parse(article.images) : [],
      tags: article.tags.map((at) => at.tag),
    }));

    return NextResponse.json({
      articles: formattedArticles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

// POST /api/admin/articles - Create a new article
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      type = "NEWS",
      status = "DRAFT",
      featuredImage,
      images,
      videoUrl,
      metaTitle,
      metaDescription,
      metaKeywords,
      isFeatured = false,
      sortOrder = 0,
      tagIds,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Check article limits
    const [totalCount, typeCount] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { type } }),
    ]);

    if (totalCount >= blogConfig.maxArticles) {
      return NextResponse.json(
        { error: `Maximum article limit (${blogConfig.maxArticles}) reached` },
        { status: 400 }
      );
    }

    const maxForType = blogConfig.maxArticlesPerType[type as keyof typeof blogConfig.maxArticlesPerType];
    if (typeCount >= maxForType) {
      return NextResponse.json(
        { error: `Maximum ${type} articles limit (${maxForType}) reached` },
        { status: 400 }
      );
    }

    // Check featured limit if setting as featured
    if (isFeatured) {
      const featuredCount = await prisma.article.count({
        where: { isFeatured: true },
      });
      if (featuredCount >= blogConfig.maxFeaturedArticles) {
        return NextResponse.json(
          { error: `Maximum featured articles limit (${blogConfig.maxFeaturedArticles}) reached` },
          { status: 400 }
        );
      }
    }

    // Generate slug
    let slug = customSlug || generateSlug(title);

    // Check for slug uniqueness
    const existingSlug = await prisma.article.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(content);

    // Generate excerpt if not provided
    const finalExcerpt = excerpt ||
      content.replace(/<[^>]*>/g, "").substring(0, blogConfig.excerptLength) + "...";

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt: finalExcerpt,
        content,
        type,
        status,
        featuredImage,
        images: images?.length ? JSON.stringify(images) : null,
        videoUrl,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || finalExcerpt,
        metaKeywords,
        isFeatured,
        sortOrder,
        readingTime,
        authorId: session.user.id,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId: string) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...article,
        images: article.images ? JSON.parse(article.images) : [],
        tags: article.tags.map((at) => at.tag),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
