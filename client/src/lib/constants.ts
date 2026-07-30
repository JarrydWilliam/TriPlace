export const CATEGORIES = [
  { id: "all",      label: "For You",   icon: "✨" },
  { id: "tech",     label: "Tech",      icon: "🤖" },
  { id: "wellness", label: "Wellness",  icon: "🧘" },
  { id: "outdoor",  label: "Outdoor",   icon: "🌲" },
  { id: "arts",     label: "Arts",      icon: "🎨" },
  { id: "food",     label: "Food",      icon: "🍳" },
  { id: "music",    label: "Music",     icon: "🎵" },
  { id: "social",   label: "Social",    icon: "🤝" },
  { id: "fitness",  label: "Fitness",   icon: "💪" },
];

export const CATEGORY_EMOJIS: Record<string, string> = {
  tech: "🤖", wellness: "🧘", outdoor: "🌲", arts: "🎨",
  food: "🍳", music: "🎵", social: "🤝", fitness: "💪",
};

export const CATEGORY_BACKGROUND_IMAGES: Record<string, string> = {
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  "future tech": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
  wellness: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
  "health & wellness": "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
  mindfulness: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
  outdoor: "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=800&q=80",
  outdoors: "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=800&q=80",
  "wild & free": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  arts: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
  "arts & culture": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
  "creative arts": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  culinary: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  music: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  "music culture": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  social: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
  fitness: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
  gaming: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80",
  literature: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
  founders: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  default: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
};

export const categoryColor: Record<string, { gradient: string; badge: string; dot: string }> = {
  tech:     { gradient: "from-cyan-500/20 to-blue-600/20",    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",    dot: "bg-cyan-400" },
  wellness: { gradient: "from-violet-500/20 to-purple-600/20", badge: "bg-violet-500/15 text-violet-300 border-violet-500/20", dot: "bg-violet-400" },
  outdoor:  { gradient: "from-emerald-500/20 to-teal-600/20", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", dot: "bg-emerald-400" },
  arts:     { gradient: "from-pink-500/20 to-fuchsia-600/20", badge: "bg-pink-500/15 text-pink-300 border-pink-500/20",    dot: "bg-pink-400" },
  food:     { gradient: "from-orange-500/20 to-amber-600/20", badge: "bg-orange-500/15 text-orange-300 border-orange-500/20", dot: "bg-orange-400" },
  music:    { gradient: "from-indigo-500/20 to-purple-600/20", badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20", dot: "bg-indigo-400" },
  social:   { gradient: "from-rose-500/20 to-red-600/20",     badge: "bg-rose-500/15 text-rose-300 border-rose-500/20",    dot: "bg-rose-400" },
  fitness:  { gradient: "from-green-500/20 to-lime-600/20",   badge: "bg-green-500/15 text-green-300 border-green-500/20",  dot: "bg-green-400" },
};

export const defaultCategoryColors = { 
  gradient: "from-primary/20 to-accent/20", 
  badge: "bg-primary/15 text-primary border-primary/20", 
  dot: "bg-primary" 
};

export function getCategoryMeta(categoryStr?: string) {
  const key = (categoryStr || "").toLowerCase().trim();
  
  let matchKey = "default";
  if (key.includes("tech")) matchKey = "tech";
  else if (key.includes("well") || key.includes("mind")) matchKey = "wellness";
  else if (key.includes("out") || key.includes("wild")) matchKey = "outdoor";
  else if (key.includes("art") || key.includes("creat")) matchKey = "arts";
  else if (key.includes("food") || key.includes("culin") || key.includes("cook")) matchKey = "food";
  else if (key.includes("music")) matchKey = "music";
  else if (key.includes("fit")) matchKey = "fitness";
  else if (key.includes("game") || key.includes("gaming")) matchKey = "gaming";
  else if (key.includes("book") || key.includes("liter")) matchKey = "literature";
  else if (key.includes("soc") || key.includes("chang")) matchKey = "social";

  const colors = categoryColor[matchKey] ?? defaultCategoryColors;
  const emoji = CATEGORY_EMOJIS[matchKey] ?? "✨";
  const bgImage = CATEGORY_BACKGROUND_IMAGES[key] || CATEGORY_BACKGROUND_IMAGES[matchKey] || CATEGORY_BACKGROUND_IMAGES.default;

  return { colors, emoji, bgImage };
}
