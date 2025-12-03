"use client";

import { useState } from "react";
import Image from "next/image";

interface PackageMediaGalleryProps {
  images: string[];
  videoId: string | null;
  packageName: string;
}

export default function PackageMediaGallery({
  images,
  videoId,
  packageName,
}: PackageMediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasMedia = images.length > 0 || videoId;
  const videoThumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null;

  // Combine video thumbnail with images for the gallery
  const allMedia = videoId
    ? [{ type: "video" as const, src: videoThumbnail! }, ...images.map((img) => ({ type: "image" as const, src: img }))]
    : images.map((img) => ({ type: "image" as const, src: img }));

  if (!hasMedia) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Main Display */}
        <div className="relative aspect-video bg-slate-100">
          {showVideo && videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={packageName}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : allMedia.length > 0 ? (
            <>
              <Image
                src={allMedia[selectedIndex].src}
                alt={`${packageName} - ${selectedIndex + 1}`}
                fill
                className="object-cover cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              />
              {/* Video play button if showing video thumbnail */}
              {allMedia[selectedIndex].type === "video" && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                >
                  <div className="w-20 h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <svg
                      className="w-10 h-10 text-purple-600 ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Watch Video
                  </span>
                </button>
              )}
              {/* Expand icon for images */}
              {allMedia[selectedIndex].type === "image" && (
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              )}
            </>
          ) : null}
        </div>

        {/* Thumbnails */}
        {allMedia.length > 1 && (
          <div className="p-4 bg-slate-50">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allMedia.map((media, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedIndex(index);
                    setShowVideo(false);
                  }}
                  className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all ${
                    selectedIndex === index
                      ? "ring-2 ring-purple-500 ring-offset-2"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={media.src}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {media.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Video/Gallery Toggle */}
        {videoId && images.length > 0 && (
          <div className="px-4 pb-4 bg-slate-50 flex gap-2">
            <button
              onClick={() => {
                setShowVideo(false);
                setSelectedIndex(0);
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                !showVideo && allMedia[selectedIndex]?.type === "video"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Photos ({images.length})
            </button>
            <button
              onClick={() => {
                setShowVideo(true);
                setSelectedIndex(0);
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                showVideo
                  ? "bg-purple-100 text-purple-700"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Video
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation arrows */}
          {allMedia.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
                }}
                className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="relative max-w-5xl max-h-[80vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {allMedia[selectedIndex]?.type === "video" ? (
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
                  title={packageName}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                />
              </div>
            ) : (
              <Image
                src={allMedia[selectedIndex]?.src || ""}
                alt={packageName}
                width={1200}
                height={800}
                className="object-contain max-h-[80vh] w-auto mx-auto rounded-lg"
              />
            )}
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {selectedIndex + 1} / {allMedia.length}
          </div>
        </div>
      )}
    </>
  );
}
