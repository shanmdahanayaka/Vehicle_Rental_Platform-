"use client";

import { useState, useEffect } from "react";
import { ArticleType } from "@prisma/client";
import ArticleCard from "@/components/ArticleCard";
import { getArticleTypeConfig, blogConfig } from "@/config/site";

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

interface Article {
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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const ARTICLE_TYPES: { value: ArticleType | ""; label: string }[] = [
  { value: "", label: "All Articles" },
  { value: "NEWS", label: "News & Updates" },
  { value: "TRAVEL_TIPS", label: "Travel Tips" },
  { value: "PROMOTION", label: "Special Offers" },
];

export default function BlogContent() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [activeType, setActiveType] = useState<ArticleType | "">("");
  const [activeTag, setActiveTag] = useState("");

  useEffect(() => {
    fetchFeaturedArticles();
    fetchPopularArticles();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchArticles(1);
  }, [activeType, activeTag]);

  const fetchArticles = async (page: number) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(blogConfig.articlesPerPage));
      if (activeType) params.set("type", activeType);
      if (activeTag) params.set("tag", activeTag);

      const res = await fetch(`/api/articles?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setArticles(data.articles);
        } else {
          setArticles((prev) => [...prev, ...data.articles]);
        }
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const fetchFeaturedArticles = async () => {
    try {
      const res = await fetch("/api/articles?featured=true&limit=3");
      if (res.ok) {
        const data = await res.json();
        setFeaturedArticles(data.articles);
      }
    } catch (error) {
      console.error("Error fetching featured articles:", error);
    }
  };

  const fetchPopularArticles = async () => {
    try {
      const res = await fetch("/api/articles?limit=5");
      if (res.ok) {
        const data = await res.json();
        // Sort by view count for popular
        const sorted = [...data.articles].sort((a, b) => b.viewCount - a.viewCount);
        setPopularArticles(sorted.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching popular articles:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/admin/tags");
      if (res.ok) {
        const data = await res.json();
        setAllTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleLoadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchArticles(pagination.page + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Featured Articles Carousel */}
      {featuredArticles.length > 0 && !activeType && !activeTag && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Featured Articles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} variant="featured" />
            ))}
          </div>
        </section>
      )}

      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1 mb-8 lg:mb-0">
          <div className="sticky top-24 space-y-6">
            {/* Type Filters */}
            <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {ARTICLE_TYPES.map((type) => {
                  const typeConfig = type.value ? getArticleTypeConfig(type.value) : null;
                  return (
                    <button
                      key={type.value}
                      onClick={() => {
                        setActiveType(type.value);
                        setActiveTag("");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium transition ${
                        activeType === type.value
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {typeConfig && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeConfig.icon} />
                        </svg>
                      )}
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setActiveTag(activeTag === tag.slug ? "" : tag.slug);
                        setActiveType("");
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        activeTag === tag.slug
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Articles */}
            {popularArticles.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Popular Articles</h3>
                <div className="space-y-3">
                  {popularArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} variant="horizontal" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Active Filters */}
          {(activeType || activeTag) && (
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-slate-500">Filtering by:</span>
              {activeType && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getArticleTypeConfig(activeType).bgColor} ${getArticleTypeConfig(activeType).textColor}`}>
                  {getArticleTypeConfig(activeType).label}
                  <button onClick={() => setActiveType("")} className="ml-1 hover:opacity-70">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {activeTag && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  #{activeTag}
                  <button onClick={() => setActiveTag("")} className="ml-1 hover:opacity-70">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Articles Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-slate-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

              {/* Load More */}
              {pagination && pagination.hasMore && (
                <div className="mt-10 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More Articles
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-sm text-slate-500">
                    Showing {articles.length} of {pagination.total} articles
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200">
              <svg className="w-16 h-16 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-slate-900">No articles found</h3>
              <p className="mt-2 text-slate-500">Check back later for new content!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
