"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArticleType } from "@prisma/client";
import { getArticleTypeConfig } from "@/config/site";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  type: ArticleType;
  featuredImage: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  author: Author;
  tags: Tag[];
}

export default function FeaturedArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles?featured=true&limit=3");
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
    }
    setLoading(false);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-8 w-48 bg-slate-200 rounded mx-auto animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 rounded mx-auto mt-4 animate-pulse" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Latest News & Tips
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Stay updated with travel tips, company news, and special offers
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {articles.map((article) => {
            const typeConfig = getArticleTypeConfig(article.type);
            return (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group block bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden hover:shadow-lg hover:ring-slate-300 transition-all duration-300"
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
                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${typeConfig.bgColor} ${typeConfig.textColor} shadow-sm`}>
                      {typeConfig.label}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {article.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      {article.author.image ? (
                        <img
                          src={article.author.image}
                          alt={article.author.name || ""}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                          {article.author.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <span className="text-slate-700">{article.author.name}</span>
                    </div>
                    <span>{formatDate(article.publishedAt)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All Link */}
        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 transition"
          >
            View All Articles
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
