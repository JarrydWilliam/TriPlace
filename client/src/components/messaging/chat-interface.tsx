import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, User } from "@shared/schema";
import { Send, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface ConversationListProps {
  conversations: Array<{
    user: User;
    lastMessage: Message;
  }>;
  onSelectConversation: (user: User) => void;
  selectedUser?: User;
}

function ConversationList({ conversations, onSelectConversation, selectedUser }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-1/3 bg-gray-800 border-r border-gray-700 dark:bg-gray-800 dark:border-gray-700">
      <div className="p-4 border-b border-gray-700 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-white dark:text-white mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary"
          />
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-0">
          {filteredConversations.map((conversation) => {
            const isSelected = selectedUser?.id === conversation.user.id;
            const timeAgo = formatDistanceToNow(new Date(conversation.lastMessage.createdAt!), { addSuffix: true });
            
            return (
              <div
                key={conversation.user.id}
                onClick={() => onSelectConversation(conversation.user)}
                className={`p-4 border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors dark:border-gray-700 dark:hover:bg-gray-750 ${
                  isSelected ? 'bg-gray-750 dark:bg-gray-750' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conversation.user.avatar || undefined} alt={conversation.user.name} />
                    <AvatarFallback className="bg-primary text-white">
                      {conversation.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white dark:text-white truncate">
                        {conversation.user.name}
                      </h4>
                      <span className="text-xs text-gray-400 dark:text-gray-400">{timeAgo}</span>
                    </div>
                    <p className="text-gray-400 dark:text-gray-400 text-sm truncate">
                      {conversation.lastMessage.content}
                    </p>
                  </div>
                  {!conversation.lastMessage.isRead && (
                    <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  user?: User;
}

function MessageBubble({ message, isOwn, user }: MessageBubbleProps) {
  const timeAgo = formatDistanceToNow(new Date(message.createdAt!), { addSuffix: true });

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
        isOwn 
          ? 'bg-primary text-white rounded-tr-md' 
          : 'bg-gray-700 text-white rounded-tl-md dark:bg-gray-700'
      }`}>
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-white/75' : 'text-gray-400 dark:text-gray-400'}`}>
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

interface ChatWindowProps {
  selectedUser?: User;
  messages: Message[];
  onSendMessage: (content: string) => void;
  loading?: boolean;
}

function ChatWindow({ selectedUser, messages, onSendMessage, loading }: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState("");
  const { user: currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedUser) {
      onSendMessage(messageInput.trim());
      setMessageInput("");
    }
  };

  if (!selectedUser) {
    return (
      <div className="hidden md:flex flex-1 items-center justify-center bg-gray-800 dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-gray-400 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white dark:text-white mb-2">Select a conversation</h3>
          <p className="text-gray-400 dark:text-gray-400">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.name} />
            <AvatarFallback className="bg-primary text-white">
              {selectedUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white dark:text-white">{selectedUser.name}</h3>
            <p className="text-gray-400 dark:text-gray-400 text-sm">Active now</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-gray-900 dark:bg-gray-900">
        <div className="space-y-1">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUser?.id}
              user={selectedUser}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 dark:bg-gray-800 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <Input
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-gray-700 border-gray-600 rounded-2xl py-2 px-4 text-white placeholder-gray-400 focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary"
          />
          <Button
            type="submit"
            disabled={!messageInput.trim() || loading}
            className="bg-primary hover:bg-primary/90 rounded-full p-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

interface ChatInterfaceProps {
  conversations: Array<{
    user: User;
    lastMessage: Message;
  }>;
  selectedUser?: User;
  messages: Message[];
  onSelectConversation: (user: User) => void;
  onSendMessage: (content: string) => void;
  loading?: boolean;
}

export function ChatInterface({
  conversations,
  selectedUser,
  messages,
  onSelectConversation,
  onSendMessage,
  loading
}: ChatInterfaceProps) {
  return (
    <div className="flex h-[calc(100vh-80px)] md:h-screen">
      <ConversationList
        conversations={conversations}
        onSelectConversation={onSelectConversation}
        selectedUser={selectedUser}
      />
      <ChatWindow
        selectedUser={selectedUser}
        messages={messages}
        onSendMessage={onSendMessage}
        loading={loading}
      />
    </div>
  );
}
