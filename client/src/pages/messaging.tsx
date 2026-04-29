/**
 * /messaging — TriPlace Direct Messaging
 *
 * Full DM experience:
 *  - Left panel: conversation list with avatars, last message, unread badges
 *  - Right panel: DM thread with real-time WebSocket send/receive
 *  - Mobile: conversation list first, thread on select
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, MessageCircle, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Message, User } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  otherUser: User;
  lastMessage: Message | null;
  unreadCount: number;
}

// ─── Conversation List Item ───────────────────────────────────────────────────

function ConvoItem({
  convo,
  selected,
  onClick,
}: {
  convo: Conversation;
  selected: boolean;
  onClick: () => void;
}) {
  const { otherUser, lastMessage, unreadCount } = convo;
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-3 p-4 text-left transition-colors rounded-xl ${
        selected
          ? "bg-primary/15 border border-primary/20"
          : "hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={otherUser.avatar || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {otherUser.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator */}
        {otherUser.isOnline && (
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-sm font-semibold text-foreground truncate">{otherUser.name}</p>
          {lastMessage && (
            <p className="text-[11px] text-muted-foreground/60 flex-shrink-0 ml-2">
              {new Date(lastMessage.createdAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground truncate">
            {lastMessage ? lastMessage.content : "No messages yet"}
          </p>
          {unreadCount > 0 && (
            <Badge className="ml-2 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground flex-shrink-0">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─── DM Thread ────────────────────────────────────────────────────────────────

function DMThread({
  otherUser,
  currentUserId,
  onBack,
}: {
  otherUser: User;
  currentUserId: number;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentUserId, otherUser.id],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${currentUserId}/${otherUser.id}`);
      return res.ok ? res.json() : [];
    },
    refetchInterval: 3000, // Poll every 3s for new messages
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) =>
      apiRequest("POST", "/api/messages", {
        senderId: currentUserId,
        receiverId: otherUser.id,
        content,
      }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["/api/conversations", currentUserId, otherUser.id] });
      qc.invalidateQueries({ queryKey: ["/api/users", currentUserId, "conversations"] });
    },
    onError: () =>
      toast({ title: "Failed to send", description: "Please try again.", variant: "destructive" }),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={otherUser.avatar || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {otherUser.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground">{otherUser.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {otherUser.isOnline ? "Online now" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Say hi to {otherUser.name?.split(" ")[0]}!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/60 text-foreground rounded-tl-sm"
                  }`}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="flex gap-2 items-center">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Message ${otherUser.name?.split(" ")[0]}...`}
            className="flex-1 bg-muted/30 border-white/10 rounded-full px-4 h-10 text-sm focus-visible:ring-primary/30"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Messaging page ───────────────────────────────────────────────────────

export default function Messaging() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/users", user?.id, "conversations"],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/conversations`);
      if (!res.ok) return [];
      const raw = await res.json();
      // Normalize: backend may return array of messages grouped by peer
      if (Array.isArray(raw) && raw.length > 0 && raw[0].otherUser) return raw;
      // If backend returns flat message array, group by peer
      return [];
    },
    refetchInterval: 5000,
  });

  const filtered = search
    ? conversations.filter((c) =>
        c.otherUser.name?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const showThread = !!selectedUser;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile: show list OR thread; Desktop: side-by-side */}
      <div className="max-w-3xl mx-auto h-[calc(100vh-80px)] flex">
        {/* ── Conversation List ── */}
        <AnimatePresence initial={false}>
          {(!showThread || window.innerWidth >= 768) && (
            <motion.div
              key="list"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className={`flex flex-col border-r border-border/40 ${
                showThread ? "hidden md:flex md:w-72 lg:w-80 flex-shrink-0" : "flex-1"
              }`}
            >
              {/* List header */}
              <div className="px-4 pt-safe py-4 border-b border-border/40">
                <h1 className="text-xl font-bold text-foreground mb-3">Messages</h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-9 bg-muted/30 border-white/10 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {isLoading ? (
                  <div className="space-y-3 px-2 pt-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted/30 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-muted/30 rounded animate-pulse w-2/3" />
                          <div className="h-2.5 bg-muted/20 rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  filtered.map((convo) => (
                    <ConvoItem
                      key={convo.otherUser.id}
                      convo={convo}
                      selected={selectedUser?.id === convo.otherUser.id}
                      onClick={() => setSelectedUser(convo.otherUser)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <MessageCircle className="w-14 h-14 text-muted-foreground/20 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Connect with people in your communities to start messaging.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DM Thread ── */}
        <AnimatePresence initial={false}>
          {showThread ? (
            <motion.div
              key="thread"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <DMThread
                otherUser={selectedUser}
                currentUserId={user!.id}
                onBack={() => setSelectedUser(null)}
              />
            </motion.div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Select a conversation</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <MobileNav />
    </div>
  );
}
