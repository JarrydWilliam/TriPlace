import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, Search, MessageCircle, ArrowLeft, Home, Compass, PlusSquare, User as UserIcon, MoreHorizontal } from "lucide-react";
import { User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { 
  MobileLayout, 
  MobileHeader, 
  MobileContent, 
  MobileBottomNav,
  MobileCard,
  MobileButton,
  MobileInput
} from "@/components/layout/mobile-layout";

// Helper function to format name as "First Name + Last Initial"
const formatDisplayName = (fullName: string | null | undefined): string => {
  if (!fullName || fullName.trim() === '') return 'Anonymous';
  
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0];
  }
  
  const firstName = nameParts[0];
  const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
};

export default function MessagingMobile() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/messages/conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/messages/conversations?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    refetchInterval: 2000, // Real-time updates
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages", selectedConversation],
    enabled: !!selectedConversation,
    queryFn: async () => {
      const response = await fetch(`/api/messages?conversationId=${selectedConversation}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 1000, // Real-time messaging
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, receiverId }: { content: string; receiverId: number }) => {
      const response = await apiRequest("POST", "/api/messages", {
        content,
        senderId: user?.id,
        receiverId
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations", user?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation && !sendMessageMutation.isPending) {
      const conversation = conversations?.find((c: any) => c.user.id === selectedConversation);
      if (conversation) {
        sendMessageMutation.mutate({
          content: newMessage.trim(),
          receiverId: conversation.user.id
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations?.filter((conversation: any) =>
    formatDisplayName(conversation.user.name).toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (authLoading) {
    return (
      <MobileLayout>
        <MobileContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </MobileContent>
      </MobileLayout>
    );
  }

  if (!user) {
    return null;
  }

  // If a conversation is selected, show the chat view
  if (selectedConversation) {
    const conversation = conversations?.find((c: any) => c.user.id === selectedConversation);
    
    return (
      <MobileLayout className="bg-background">
        {/* Chat Header */}
        <MobileHeader>
          <div className="flex items-center space-x-3">
            <MobileButton 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </MobileButton>
            <Avatar className="w-8 h-8">
              <AvatarImage src={conversation?.user.avatar} />
              <AvatarFallback className="text-xs">
                {formatDisplayName(conversation?.user.name).charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1">
              <h1 className="text-lg font-semibold truncate">
                {formatDisplayName(conversation?.user.name)}
              </h1>
              <div className="text-xs text-muted-foreground">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></span>
                Online
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <MobileButton variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </MobileButton>
          </div>
        </MobileHeader>

        {/* Messages Area */}
        <MobileContent className="flex flex-col h-full p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-muted h-16 rounded-lg" />
                ))}
              </div>
            ) : messages?.length > 0 ? (
              messages.map((message: any) => {
                const isOwnMessage = message.senderId === user?.id;
                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      <div className={`
                        rounded-2xl px-4 py-2 shadow-sm
                        ${isOwnMessage 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-muted'
                        }
                      `}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className={`text-xs text-muted-foreground mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation!</p>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
              />
              <MobileButton
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </MobileButton>
            </div>
          </div>
        </MobileContent>
      </MobileLayout>
    );
  }

  // Main conversations list view
  return (
    <MobileLayout hasBottomNav={true} className="bg-background">
      {/* Mobile Header */}
      <MobileHeader>
        <div className="flex items-center space-x-3">
          <MobileButton 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4" />
          </MobileButton>
          <Logo size="sm" />
          <div className="flex flex-col flex-1">
            <h1 className="text-lg font-semibold">Messages</h1>
            <div className="text-xs text-muted-foreground">
              {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <MobileButton variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </MobileButton>
        </div>
      </MobileHeader>

      {/* Mobile Content */}
      <MobileContent className="p-0">
        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse bg-muted h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredConversations.length > 0 ? (
            <div className="divide-y">
              {filteredConversations.map((conversation: any) => (
                <MobileCard
                  key={conversation.user.id}
                  clickable
                  padding={false}
                  className="p-4 rounded-none border-0"
                  onClick={() => setSelectedConversation(conversation.user.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.user.avatar} />
                        <AvatarFallback>
                          {formatDisplayName(conversation.user.name).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">
                          {formatDisplayName(conversation.user.name)}
                        </h3>
                        <div className="text-xs text-muted-foreground">
                          {conversation.lastMessage?.createdAt && 
                            new Date(conversation.lastMessage.createdAt).toLocaleDateString()
                          }
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
              <div>
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                <p className="text-sm">
                  {searchQuery 
                    ? 'No conversations match your search.' 
                    : 'Start connecting with community members to begin messaging!'
                  }
                </p>
                {!searchQuery && (
                  <MobileButton 
                    className="mt-4"
                    onClick={() => setLocation('/dashboard')}
                  >
                    Explore Communities
                  </MobileButton>
                )}
              </div>
            </div>
          )}
        </div>
      </MobileContent>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav>
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/dashboard')}
          className="flex-col space-y-1"
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/communities')}
          className="flex-col space-y-1"
        >
          <Compass className="w-5 h-5" />
          <span className="text-xs">Explore</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/create-event')}
          className="flex-col space-y-1"
        >
          <PlusSquare className="w-5 h-5" />
          <span className="text-xs">Create</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/messaging')}
          className="flex-col space-y-1 text-primary"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs">Messages</span>
        </MobileButton>
        
        <MobileButton 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/profile')}
          className="flex-col space-y-1"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </MobileButton>
      </MobileBottomNav>
    </MobileLayout>
  );
}