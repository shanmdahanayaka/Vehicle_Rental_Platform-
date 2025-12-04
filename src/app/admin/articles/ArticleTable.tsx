"use client";

import { useState, useEffect } from "react";
import { ArticleType, ArticleStatus } from "@prisma/client";
import { useUI } from "@/components/ui/UIProvider";
import { blogConfig, getArticleTypeConfig } from "@/config/site";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface Author {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  type: ArticleType;
  status: ArticleStatus;
  featuredImage: string | null;
  images: string[];
  videoUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  isFeatured: boolean;
  sortOrder: number;
  readingTime: number | null;
  viewCount: number;
  author: Author;
  tags: Tag[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ArticleStats {
  counts: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    featured: number;
  };
  limits: {
    maxArticles: number;
    maxArticlesPerType: Record<string, number>;
    maxFeaturedArticles: number;
  };
  remaining: {
    total: number;
    byType: Record<string, number>;
    featured: number;
  };
  totalViews: number;
}

const STATUS_COLORS: Record<ArticleStatus, string> = {
  DRAFT: "bg-yellow-100 text-yellow-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-700",
};

export default function ArticleTable() {
  const { confirm, toast } = useUI();
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<ArticleType | "">("");
  const [filterStatus, setFilterStatus] = useState<ArticleStatus | "">("");
  const [filterFeatured, setFilterFeatured] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchArticles();
    fetchStats();
    fetchTags();
  }, [filterType, filterStatus, filterFeatured, search]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      if (filterFeatured) params.set("featured", filterFeatured);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/articles?${params}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/articles/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
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

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Article",
      message: "Are you sure you want to delete this article? This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ message: "Article deleted successfully", type: "success" });
        fetchArticles();
        fetchStats();
      } else {
        const error = await res.json();
        toast({ message: error.error || "Failed to delete article", type: "error" });
      }
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({ message: "Failed to delete article", type: "error" });
    }
  };

  const handleToggleStatus = async (article: Article, newStatus: ArticleStatus) => {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ message: `Article ${newStatus.toLowerCase()}`, type: "success" });
        fetchArticles();
        fetchStats();
      }
    } catch (error) {
      console.error("Error updating article:", error);
    }
  };

  const handleToggleFeatured = async (article: Article) => {
    if (!article.isFeatured && stats && stats.remaining.featured <= 0) {
      toast({ message: `Maximum featured articles limit (${stats.limits.maxFeaturedArticles}) reached`, type: "error" });
      return;
    }

    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !article.isFeatured }),
      });
      if (res.ok) {
        fetchArticles();
        fetchStats();
      }
    } catch (error) {
      console.error("Error updating article:", error);
    }
  };

  const canCreateArticle = () => {
    if (!stats) return false;
    return stats.remaining.total > 0;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.counts.total}</p>
            <p className="text-xs text-slate-500">/ {stats.limits.maxArticles} max</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-blue-600 uppercase tracking-wider">News</p>
            <p className="text-2xl font-bold text-slate-900">{stats.counts.byType.NEWS || 0}</p>
            <p className="text-xs text-slate-500">/ {stats.limits.maxArticlesPerType.NEWS} max</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-green-600 uppercase tracking-wider">Travel Tips</p>
            <p className="text-2xl font-bold text-slate-900">{stats.counts.byType.TRAVEL_TIPS || 0}</p>
            <p className="text-xs text-slate-500">/ {stats.limits.maxArticlesPerType.TRAVEL_TIPS} max</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-purple-600 uppercase tracking-wider">Promotions</p>
            <p className="text-2xl font-bold text-slate-900">{stats.counts.byType.PROMOTION || 0}</p>
            <p className="text-xs text-slate-500">/ {stats.limits.maxArticlesPerType.PROMOTION} max</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-amber-600 uppercase tracking-wider">Featured</p>
            <p className="text-2xl font-bold text-slate-900">{stats.counts.featured}</p>
            <p className="text-xs text-slate-500">/ {stats.limits.maxFeaturedArticles} max</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Views</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalViews.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ArticleType | "")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="NEWS">News</option>
            <option value="TRAVEL_TIPS">Travel Tips</option>
            <option value="PROMOTION">Promotions</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ArticleStatus | "")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            value={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Articles</option>
            <option value="true">Featured Only</option>
            <option value="false">Not Featured</option>
          </select>
        </div>
        <button
          onClick={() => {
            if (!canCreateArticle()) {
              toast({ message: "Maximum article limit reached", type: "error" });
              return;
            }
            setEditingArticle(null);
            setShowModal(true);
          }}
          disabled={!canCreateArticle()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + New Article
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Article
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Author
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Views
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Featured
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : articles.length > 0 ? (
                articles.map((article) => {
                  const typeConfig = getArticleTypeConfig(article.type);
                  return (
                    <tr key={article.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {article.featuredImage ? (
                            <img
                              src={article.featuredImage}
                              alt={article.title}
                              className="w-16 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-16 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900 line-clamp-1">{article.title}</p>
                            <p className="text-xs text-slate-500">
                              {article.readingTime} min read · {new Date(article.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[article.status]}`}>
                          {article.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {article.author.image ? (
                            <img src={article.author.image} alt={article.author.name || ""} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                              {article.author.name?.charAt(0) || "?"}
                            </div>
                          )}
                          <span className="text-sm text-slate-700">{article.author.name || article.author.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {article.viewCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleFeatured(article)}
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            article.isFeatured
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {article.isFeatured ? "Featured" : "Not Featured"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingArticle(article);
                              setShowModal(true);
                            }}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                          >
                            Edit
                          </button>
                          {article.status === "DRAFT" && (
                            <button
                              onClick={() => handleToggleStatus(article, "PUBLISHED")}
                              className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition"
                            >
                              Publish
                            </button>
                          )}
                          {article.status === "PUBLISHED" && (
                            <button
                              onClick={() => handleToggleStatus(article, "ARCHIVED")}
                              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-slate-500">No articles found. Create your first article!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ArticleModal
          article={editingArticle}
          tags={allTags}
          stats={stats}
          onClose={() => {
            setShowModal(false);
            setEditingArticle(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingArticle(null);
            fetchArticles();
            fetchStats();
          }}
          onTagsChange={fetchTags}
        />
      )}
    </div>
  );
}

// Article Modal Component
function ArticleModal({
  article,
  tags,
  stats,
  onClose,
  onSave,
  onTagsChange,
}: {
  article: Article | null;
  tags: Tag[];
  stats: ArticleStats | null;
  onClose: () => void;
  onSave: () => void;
  onTagsChange: () => void;
}) {
  const { toast } = useUI();
  const [formData, setFormData] = useState({
    title: article?.title || "",
    slug: article?.slug || "",
    excerpt: article?.excerpt || "",
    content: article?.content || "",
    type: article?.type || "NEWS" as ArticleType,
    status: article?.status || "DRAFT" as ArticleStatus,
    featuredImage: article?.featuredImage || "",
    images: article?.images || [],
    videoUrl: article?.videoUrl || "",
    metaTitle: article?.metaTitle || "",
    metaDescription: article?.metaDescription || "",
    metaKeywords: article?.metaKeywords || "",
    isFeatured: article?.isFeatured || false,
    sortOrder: article?.sortOrder?.toString() || "0",
    tagIds: article?.tags.map((t) => t.id) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "media" | "seo">("content");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Title and content are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = article ? `/api/admin/articles/${article.id}` : "/api/admin/articles";
      const method = article ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (res.ok) {
        toast({ message: article ? "Article updated" : "Article created", type: "success" });
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save article");
      }
    } catch (err) {
      console.error("Error saving article:", err);
      setError("Failed to save article");
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "featured" | "gallery") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === "gallery" && formData.images.length + files.length > blogConfig.maxImagesPerArticle) {
      toast({ message: `Maximum ${blogConfig.maxImagesPerArticle} images allowed`, type: "error" });
      return;
    }

    setImageUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);

        const res = await fetch("/api/upload/google-drive", {
          method: "POST",
          body: formDataUpload,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      if (type === "featured") {
        setFormData((prev) => ({ ...prev, featuredImage: uploadedUrls[0] }));
      } else {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls].slice(0, blogConfig.maxImagesPerArticle),
        }));
      }
    } catch (err) {
      console.error("Error uploading images:", err);
      toast({ message: "Failed to upload images", type: "error" });
    }

    setImageUploading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleTagToggle = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (res.ok) {
        const newTag = await res.json();
        setFormData((prev) => ({
          ...prev,
          tagIds: [...prev.tagIds, newTag.id],
        }));
        setNewTagName("");
        onTagsChange();
      } else {
        const data = await res.json();
        toast({ message: data.error || "Failed to create tag", type: "error" });
      }
    } catch (err) {
      console.error("Error creating tag:", err);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {article ? "Edit Article" : "New Article"}
          </h2>
          <div className="flex gap-2">
            {["content", "media", "seo"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Content Tab */}
          {activeTab === "content" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Enter article title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ArticleType })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="NEWS">News & Updates</option>
                    <option value="TRAVEL_TIPS">Travel Tips</option>
                    <option value="PROMOTION">Special Offers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ArticleStatus })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="auto-generated-from-title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Excerpt</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  rows={2}
                  placeholder="Short description for article preview (auto-generated if empty)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
                  rows={12}
                  placeholder="Write your article content here... (HTML supported)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        formData.tagIds.includes(tag.id)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag name"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateTag())}
                  />
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded border-slate-300"
                    disabled={!article?.isFeatured && !!stats && stats.remaining.featured <= 0}
                  />
                  Featured on Homepage
                </label>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === "media" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Featured Image</label>
                <div className="flex items-start gap-4">
                  {formData.featuredImage ? (
                    <div className="relative group">
                      <img
                        src={formData.featuredImage}
                        alt="Featured"
                        className="w-48 h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, featuredImage: "" })}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="w-48 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      {imageUploading ? (
                        <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs text-slate-500 mt-1">Upload Featured Image</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "featured")}
                        className="hidden"
                        disabled={imageUploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Gallery Images (max {blogConfig.maxImagesPerArticle})
                </label>
                <div className="flex flex-wrap gap-3">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {formData.images.length < blogConfig.maxImagesPerArticle && (
                    <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      {imageUploading ? (
                        <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <>
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-xs text-slate-500 mt-1">Add</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e, "gallery")}
                        className="hidden"
                        disabled={imageUploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">YouTube Video URL</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {formData.videoUrl && getYouTubeVideoId(formData.videoUrl) && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative w-40 h-24 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={`https://img.youtube.com/vi/${getYouTubeVideoId(formData.videoUrl)}/mqdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-sm text-green-600">Valid YouTube URL</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === "seo" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meta Title</label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="SEO title (defaults to article title)"
                />
                <p className="text-xs text-slate-500 mt-1">{formData.metaTitle.length || formData.title.length}/60 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meta Description</label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="SEO description (defaults to excerpt)"
                />
                <p className="text-xs text-slate-500 mt-1">{formData.metaDescription.length}/160 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meta Keywords</label>
                <input
                  type="text"
                  value={formData.metaKeywords}
                  onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Search Preview</p>
                <div className="text-blue-700 text-lg hover:underline cursor-pointer">
                  {formData.metaTitle || formData.title || "Article Title"}
                </div>
                <div className="text-green-700 text-sm">
                  yourdomain.com/blog/{formData.slug || "article-slug"}
                </div>
                <div className="text-slate-600 text-sm mt-1">
                  {formData.metaDescription || formData.excerpt || "Article description will appear here..."}
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : article ? "Update Article" : "Create Article"}
          </button>
        </div>
      </div>
    </div>
  );
}
