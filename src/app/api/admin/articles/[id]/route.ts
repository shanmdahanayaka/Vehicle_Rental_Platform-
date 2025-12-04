import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ArticleStatus } from "@prisma/client";
import { blogConfig, calculateReadingTime, generateSlug } from "@/config/site";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN", "MANAGER"];

async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/articles/[id] - Get single article
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const article = await prisma.article.findUnique({
      where: { id },
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

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...article,
      images: article.images ? JSON.parse(article.images) : [],
      tags: article.tags.map((at) => at.tag),
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/articles/[id] - Update article
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      type,
      status,
      featuredImage,
      images,
      videoUrl,
      metaTitle,
      metaDescription,
      metaKeywords,
      isFeatured,
      sortOrder,
      tagIds,
    } = body;

    // Check featured limit if setting as featured
    if (isFeatured && !existingArticle.isFeatured) {
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

    // Handle slug update
    let finalSlug = existingArticle.slug;
    if (customSlug && customSlug !== existingArticle.slug) {
      const slugExists = await prisma.article.findFirst({
        where: { slug: customSlug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 400 }
        );
      }
      finalSlug = customSlug;
    } else if (title && title !== existingArticle.title && !customSlug) {
      const newSlug = generateSlug(title);
      const slugExists = await prisma.article.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      finalSlug = slugExists ? `${newSlug}-${Date.now()}` : newSlug;
    }

    // Calculate reading time if content changed
    const readingTime = content
      ? calculateReadingTime(content)
      : existingArticle.readingTime;

    // Handle publish date
    let publishedAt = existingArticle.publishedAt;
    if (status === "PUBLISHED" && existingArticle.status !== "PUBLISHED") {
      publishedAt = new Date();
    } else if (status && status !== "PUBLISHED") {
      publishedAt = null;
    }

    // Generate excerpt if content changed and no excerpt provided
    let finalExcerpt = excerpt;
    if (content && !excerpt) {
      finalExcerpt = content.replace(/<[^>]*>/g, "").substring(0, blogConfig.excerptLength) + "...";
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      await prisma.articleTag.deleteMany({ where: { articleId: id } });
    }

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(title && { title }),
        slug: finalSlug,
        ...(finalExcerpt !== undefined && { excerpt: finalExcerpt }),
        ...(content && { content }),
        ...(type && { type }),
        ...(status && { status }),
        ...(featuredImage !== undefined && { featuredImage }),
        ...(images !== undefined && { images: images?.length ? JSON.stringify(images) : null }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(metaKeywords !== undefined && { metaKeywords }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(sortOrder !== undefined && { sortOrder }),
        readingTime,
        publishedAt,
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

    return NextResponse.json({
      ...article,
      images: article.images ? JSON.parse(article.images) : [],
      tags: article.tags.map((at) => at.tag),
    });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/articles/[id] - Delete article
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await prisma.article.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
