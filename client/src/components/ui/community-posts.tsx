import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: number;
  communityId: number;
  content: string;
  kudosCount: number;
  replyCount: number;
  createdAt: string;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
}

interface CommunityPostsProps {
  communityId: number;
}

function PostCard({ post, userId }: { post: Post; userId: number }) {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [localCount, setLocalCount] = useState(post.kudosCount ?? 0);

  const giveKudos = useMutation({
    mutationFn: () =>
      apiRequest(`/api/posts/${post.id}/kudos`, {
        method: "POST",
        body: JSON.stringify({ giverId: userId }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (data: any) => {
      if (!data.alreadyGiven) {
        setLiked(true);
        setLocalCount(data.newCount);
        // Trigger haptic feedback if running as native app
        try {
          (window as any).Capacitor?.Plugins?.Haptics?.impact({ style: "light" });
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["/api/communities", post.communityId, "posts"] });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={post.authorAvatar ?? undefined} />
          <AvatarFallback className="text-xs">{post.authorName?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{post.authorName}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">{post.content}</p>
          <div className="flex items-center gap-4 mt-3">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => !liked && giveKudos.mutate()}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"
              }`}
              disabled={liked}
            >
              <motion.span
                animate={liked ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
              </motion.span>
              <span>{localCount}</span>
            </motion.button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <MessageSquare className="w-4 h-4" />
              <span>{post.replyCount}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CommunityPosts({ communityId }: CommunityPostsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/communities", communityId, "posts"],
    queryFn: () => apiRequest(`/api/communities/${communityId}/posts`),
    refetchInterval: 30_000,
  });

  const createPost = useMutation({
    mutationFn: () =>
      apiRequest(`/api/communities/${communityId}/posts`, {
        method: "POST",
        body: JSON.stringify({ authorId: user?.id, content: newPostContent.trim() }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      setNewPostContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/communities", communityId, "posts"] });
    },
  });

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Compose a post */}
      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user.avatar ?? undefined} />
            <AvatarFallback className="text-xs">{user.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <Textarea
            ref={textareaRef}
            placeholder="Share something with your community..."
            className="resize-none text-sm min-h-[72px] bg-background/50 border-border/50"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="flex items-center justify-between pl-11">
          <span className="text-xs text-muted-foreground">{newPostContent.length}/500</span>
          <Button
            size="sm"
            onClick={() => createPost.mutate()}
            disabled={!newPostContent.trim() || createPost.isPending}
            className="gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            Post
          </Button>
        </div>
      </div>

      {/* Post feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} userId={user.id} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
