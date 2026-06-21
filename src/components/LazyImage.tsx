/**
 * LazyImage – performance-optimized image component.
 * Uses native browser lazy loading, explicit width/height to prevent layout shifts,
 * and decoding="async" for off-main-thread decoding.
 * Falls back to a placeholder avatar on error.
 */
import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  aspectRatio?: string; // e.g. "1/1", "16/9"
}

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='38' rx='14' ry='10' fill='%2394a3b8'/%3E%3C/svg%3E";

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallback = PLACEHOLDER,
  aspectRatio,
  className = '',
  style,
  ...rest
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setImgSrc(fallback)}
      className={className}
      style={{ aspectRatio, objectFit: 'cover', ...style }}
      {...rest}
    />
  );
};
