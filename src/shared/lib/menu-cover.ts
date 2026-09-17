const MENU_COVERS: Array<{ match: RegExp; url: string }> = [
  {
    match: /katsu/i,
    url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80",
  },
  {
    match: /telur|dadar|omelet/i,
    url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80",
  },
  {
    match: /kecap/i,
    url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
  },
  {
    match: /tempe/i,
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
  },
  {
    match: /ikan|balado|fish/i,
    url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80",
  },
];

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80";

export function menuCoverUrl(name: string, imageUrl?: string | null) {
  if (imageUrl) return imageUrl;
  const found = MENU_COVERS.find((item) => item.match.test(name));
  return found?.url ?? FALLBACK_COVER;
}
