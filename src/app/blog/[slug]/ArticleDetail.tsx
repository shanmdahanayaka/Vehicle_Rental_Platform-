"use client";

import { useState } from "react";
import Link from "next/link";
import { ArticleType } from "@prisma/client";
import { getArticleTypeConfig, brand, contact } from "@/config/site";

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
  content: string;
  type: ArticleType;
  featuredImage: string | null;
  images: string[];
  videoUrl: string | null;
  readingTime: number | null;
  viewCount: number;
  publishedAt: string | null;
  author: Author;
  tags: Tag[];
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  readingTime: number | null;
  publishedAt: string | null;
}

interface ArticleDetailProps {
  article: Article;
  relatedArticles: RelatedArticle[];
}

export default function ArticleDetail({ article, relatedArticles }: ArticleDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const typeConfig = getArticleTypeConfig(article.type);

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = article.title;

    let shareUrl = "";
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] bg-slate-900">
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${typeConfig.gradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-4xl mx-auto">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
              {typeConfig.label}
            </span>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold text-white leading-tight">
              {article.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-slate-300">
              <div className="flex items-center gap-2">
                {article.author.image ? (
                  <img src={article.author.image} alt={article.author.name || ""} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
                    {article.author.name?.charAt(0) || "?"}
                  </div>
                )}
                <span className="font-medium text-white">{article.author.name}</span>
              </div>
              <span className="text-slate-400">·</span>
              <span>{formatDate(article.publishedAt)}</span>
              <span className="text-slate-400">·</span>
              <span>{article.readingTime} min read</span>
              <span className="text-slate-400">·</span>
              <span>{article.viewCount.toLocaleString()} views</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Main Content */}
          <article className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 md:p-10">
              {/* Article Content */}
              <div
                className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* Image Gallery */}
              {article.images.length > 0 && (
                <div className="mt-10 border-t border-slate-200 pt-10">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Gallery</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {article.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => openLightbox(index)}
                        className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition"
                      >
                        <img
                          src={image}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube Video */}
              {article.videoUrl && getYouTubeVideoId(article.videoUrl) && (
                <div className="mt-10 border-t border-slate-200 pt-10">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Video</h3>
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-900">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(article.videoUrl)}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="mt-10 border-t border-slate-200 pt-6">
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/blog?tag=${tag.slug}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 transition"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Buttons */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <p className="text-sm font-medium text-slate-700 mb-3">Share this article</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleShare("twitter")}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1DA1F2] text-white hover:opacity-90 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleShare("facebook")}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#4267B2] text-white hover:opacity-90 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleShare("linkedin")}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0A66C2] text-white hover:opacity-90 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleShare("whatsapp")}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white hover:opacity-90 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Back Link */}
            <Link
              href="/blog"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Blog
            </Link>
          </article>

          {/* Sidebar */}
          <aside className="mt-10 lg:mt-0">
            <div className="sticky top-24 space-y-6">
              {/* Author Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  About the Author
                </h3>
                <div className="flex items-center gap-4">
                  {article.author.image ? (
                    <img
                      src={article.author.image}
                      alt={article.author.name || ""}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                      {article.author.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-900">{article.author.name}</p>
                    <p className="text-sm text-slate-500">{brand.name} Team</p>
                  </div>
                </div>
              </div>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Related Articles
                  </h3>
                  <div className="space-y-4">
                    {relatedArticles.map((related) => (
                      <Link
                        key={related.id}
                        href={`/blog/${related.slug}`}
                        className="group block"
                      >
                        <div className="flex gap-3">
                          {related.featuredImage ? (
                            <img
                              src={related.featuredImage}
                              alt={related.title}
                              className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-20 h-16 bg-gradient-to-br ${typeConfig.gradient} rounded-lg flex-shrink-0`} />
                          )}
                          <div>
                            <h4 className="font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {related.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {related.readingTime} min read
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="font-bold text-lg">Need a Vehicle?</h3>
                <p className="mt-2 text-sm text-white/80">
                  Explore our premium fleet and book your next adventure today!
                </p>
                <Link
                  href="/vehicles"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-white/90 transition"
                >
                  Browse Vehicles
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => setLightboxIndex((prev) => (prev === 0 ? article.images.length - 1 : prev - 1))}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <img
            src={article.images[lightboxIndex]}
            alt={`Image ${lightboxIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
          />
          <button
            onClick={() => setLightboxIndex((prev) => (prev === article.images.length - 1 ? 0 : prev + 1))}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIndex + 1} / {article.images.length}
          </div>
        </div>
      )}
    </main>
  );
}
