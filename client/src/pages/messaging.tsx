import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ChatInterface } from "@/components/messaging/chat-interface";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Logo } from "@/components/ui/logo";

export default function Messaging() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | undefined>();

  // Fetch user conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'conversations'],
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/conversations', user?.id, selectedUser?.id],
    enabled: !!user && !!selectedUser,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !selectedUser) throw new Error("No user or selected user");
      const response = await apiRequest('POST', '/api/messages', {
        senderId: user.id,
        receiverId: selectedUser.id,
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'conversations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectConversation = (chatUser: User) => {
    setSelectedUser(chatUser);
  };

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-900">
      <div className="flex min-h-screen">
        <Sidebar />
        
        <main className="flex-1 pb-20 md:pb-0">
          {conversationsLoading ? (
            <div className="flex h-screen items-center justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ChatInterface
              conversations={conversations}
              selectedUser={selectedUser}
              messages={messages}
              onSelectConversation={handleSelectConversation}
              onSendMessage={handleSendMessage}
              loading={sendMessageMutation.isPending || messagesLoading}
            />
          )}
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
