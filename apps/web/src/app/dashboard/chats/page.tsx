'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Chat {
  id: string;
  title: string;
  isUnread: boolean;
  lastMessageAt: string | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    company: {
      id: string;
      name: string;
    } | null;
  };
  messages: Array<{
    id: string;
    content: string;
    isIncoming: boolean;
    createdAt: string;
  }>;
}

interface Message {
  id: string;
  content: string;
  isIncoming: boolean;
  createdAt: string;
}

export default function ChatsPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Initialize WebSocket
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const newSocket = io(`${wsUrl}/ws`, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('message', (data: Message) => {
      queryClient.setQueryData(['messages', selectedChatId], (old: any) => {
        if (!old || old.chatId !== selectedChatId) return old;
        return {
          ...old,
          data: [...(old.data || []), data],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    });

    newSocket.on('notification', (notification: any) => {
      console.log('Notification received:', notification);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Join chat room when selected
  useEffect(() => {
    if (socket && selectedChatId) {
      socket.emit('join:chat', { chatId: selectedChatId });
      return () => {
        socket.emit('leave:chat', { chatId: selectedChatId });
      };
    }
  }, [socket, selectedChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChatId]);

  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await api.get('/chats');
      return response.data;
    },
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return null;
      const response = await api.get(`/messages/chat/${selectedChatId}`);
      return response.data;
    },
    enabled: !!selectedChatId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedChatId) return;
      await api.post('/messages', {
        chatId: selectedChatId,
        content,
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  const generateDraftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChatId) return;
      const response = await api.post(`/messages/chat/${selectedChatId}/ai-draft`);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.draft) {
        setMessage(data.draft);
      }
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await api.patch(`/chats/${chatId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  const chats = chatsData || [];
  const messages = messagesData?.data || [];

  const selectedChat = chats.find((c: Chat) => c.id === selectedChatId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedChatId) {
      sendMessageMutation.mutate(message);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    markAsReadMutation.mutate(chatId);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white">
      {/* Chat Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatsLoading ? (
            <div className="p-4 text-center text-gray-500">Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No chats yet</div>
          ) : (
            chats.map((chat: Chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedChatId === chat.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {chat.contact.firstName?.[0] || chat.contact.email?.[0] || '?'}
                        </span>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {chat.contact.firstName || chat.contact.lastName
                            ? `${chat.contact.firstName || ''} ${chat.contact.lastName || ''}`.trim()
                            : chat.contact.email || 'Unnamed'}
                        </p>
                        {chat.contact.company && (
                          <p className="text-xs text-gray-500 truncate">
                            {chat.contact.company.name}
                          </p>
                        )}
                        {chat.messages?.[0] && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {chat.messages[0].content.substring(0, 50)}
                            {chat.messages[0].content.length > 50 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {chat.isUnread && (
                    <div className="ml-2 flex-shrink-0">
                      <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedChat.contact.firstName || selectedChat.contact.lastName
                      ? `${selectedChat.contact.firstName || ''} ${selectedChat.contact.lastName || ''}`.trim()
                      : selectedChat.contact.email || 'Unnamed'}
                  </h3>
                  {selectedChat.contact.company && (
                    <p className="text-sm text-gray-500">{selectedChat.contact.company.name}</p>
                  )}
                </div>
                <button
                  onClick={() => generateDraftMutation.mutate()}
                  disabled={generateDraftMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  {generateDraftMutation.isPending ? 'Generating...' : '✨ AI Draft'}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No messages yet</div>
              ) : (
                messages.map((msg: Message) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isIncoming ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.isIncoming
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-primary-600 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.isIncoming ? 'text-gray-500' : 'text-primary-100'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

