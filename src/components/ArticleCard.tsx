"use client";

import Link from "next/link";
import { ArticleType } from "@prisma/client";
import { getArticleTypeConfig } from "@/config/site";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    type: ArticleType;
    featuredImage: string | null;
    isFeatured: boolean;
    readingTime: number | null;
    viewCount: number;
    publishedAt: string | null;
    author: Author;
    tags: Tag[];
  };
  variant?: "default" | "featured" | "horizontal";
}

export default function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const typeConfig = getArticleTypeConfig(article.type);

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (variant === "horizontal") {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className="group flex gap-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 hover:shadow-md hover:ring-slate-300 transition-all"
      >
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex-shrink-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeConfig.icon} />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {article.title}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            {article.readingTime} min read
          </p>
        </div>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className="group relative block h-[400px] rounded-2xl overflow-hidden"
      >
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${typeConfig.gradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
            {typeConfig.label}
          </span>
          <h3 className="mt-3 text-2xl font-bold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
            {article.title}
          </h3>
          <p className="mt-2 text-sm text-slate-200 line-clamp-2">
            {article.excerpt}
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
            {article.author.image ? (
              <img src={article.author.image} alt={article.author.name || ""} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
                {article.author.name?.charAt(0) || "?"}
              </div>
            )}
            <span>{article.author.name}</span>
            <span className="text-slate-400">·</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden hover:shadow-lg hover:ring-slate-300 transition-all duration-300"
    >
      <div className="relative h-48 overflow-hidden">
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center`}>
            <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeConfig.icon} />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeConfig.bgColor} ${typeConfig.textColor} shadow-sm`}>
            {typeConfig.label}
          </span>
        </div>
        {article.isFeatured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Featured
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {article.title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
          {article.excerpt}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            {article.author.image ? (
              <img src={article.author.image} alt={article.author.name || ""} className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                {article.author.name?.charAt(0) || "?"}
              </div>
            )}
            <span className="text-slate-700">{article.author.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {article.readingTime} min
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {article.viewCount}
            </span>
          </div>
        </div>
        {article.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
