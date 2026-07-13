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
