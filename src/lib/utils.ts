import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function formatLocation(location: any) {
  if (!location) return '';
  const { municipality, province, locality } = location;
  const parts = [];
  if (locality && locality.trim()) parts.push(locality.trim());
  if (municipality && municipality.trim()) parts.push(municipality.trim());
  if (province && province.trim()) parts.push(province.trim());
  return parts.join(', ') + (parts.length > 0 ? ', Cuba' : 'Cuba');
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanPackagingName(name: string | undefined | null): string {
  if (!name) return '';
  return name.replace(/\s*[xX]\s*\d+\s*$/, '').trim();
}

export function getProxyImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  
  const trimmedUrl = url.trim();
  
  // Google Drive conversion
  // Soporta links de tipo:
  // - https://drive.google.com/file/d/ID/view...
  // - https://drive.google.com/open?id=ID
  // - https://docs.google.com/uc?id=ID
  if (trimmedUrl.includes('drive.google.com') || trimmedUrl.includes('docs.google.com')) {
    const match = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                  trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                  trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                  
    if (match && match[1]) {
      // Usar el endpoint de thumbnails o lh3 que es más estable para <img>
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  
  return trimmedUrl;
}
