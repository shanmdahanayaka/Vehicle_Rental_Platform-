import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/articles/[slug] - Get single published article (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const article = await prisma.article.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
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

    // Increment view count (fire and forget)
    prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    }).catch(console.error);

    // Fetch related articles (same type, excluding current)
    const relatedArticles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        type: article.type,
        id: { not: article.id },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        readingTime: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
    });

    return NextResponse.json({
      article: {
        ...article,
        images: article.images ? JSON.parse(article.images) : [],
        tags: article.tags.map((at) => at.tag),
      },
      relatedArticles,
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}
