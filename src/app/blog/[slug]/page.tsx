import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleDetail from "./ArticleDetail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      title: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      featuredImage: true,
    },
  });

  if (!article) {
    return { title: "Article Not Found" };
  }

  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt || undefined,
    keywords: article.metaKeywords || undefined,
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || undefined,
      type: "article",
      images: article.featuredImage ? [article.featuredImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || undefined,
      images: article.featuredImage ? [article.featuredImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
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
    notFound();
  }

  // Increment view count
  await prisma.article.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  });

  // Fetch related articles
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

  // Format article data
  const formattedArticle = {
    ...article,
    images: article.images ? JSON.parse(article.images) : [],
    tags: article.tags.map((at) => at.tag),
    publishedAt: article.publishedAt?.toISOString() || null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };

  const formattedRelated = relatedArticles.map((a) => ({
    ...a,
    publishedAt: a.publishedAt?.toISOString() || null,
  }));

  return <ArticleDetail article={formattedArticle} relatedArticles={formattedRelated} />;
}
