'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, MessageCircle, Settings, User, Users, UserPlus } from 'lucide-react';
import UserSearch from './UserSearch';
import ProfileSettings from './ProfileSettings';
import { socketService } from '@/services/socketService';

interface Chat {
  id: string;
  name?: string;
  avatar?: string;
  type: 'direct' | 'group';
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    status: string;
  };
  members?: any[];
}

interface ChatListProps {
  selectedUserId: string | null;
  onSelectUser: (userId: string, type: 'chat' | 'group') => void;
  filter: 'all' | 'chats' | 'groups';
  chats: Chat[];
  onRefresh: () => void;
  onCreateGroup: () => void;
}

export default function ChatList({
  selectedUserId,
  onSelectUser,
  filter,
  chats,
  onRefresh,
  onCreateGroup
}: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  // unreadCounts: chatId -> count of unread messages received while not in that chat
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const selectedUserIdRef = useRef(selectedUserId);

  // Keep ref in sync
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
    // Clear unread count for the currently opened chat
    if (selectedUserId) {
      setUnreadCounts(prev => ({ ...prev, [selectedUserId]: 0 }));
    }
  }, [selectedUserId]);

  useEffect(() => {
    let filtered = chats;

    if (filter === 'chats') {
      filtered = filtered.filter(chat => chat.type === 'direct');
    } else if (filter === 'groups') {
      filtered = filtered.filter(chat => chat.type === 'group');
    }

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(chat => {
        const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
        const chatName = chat.type === 'group'
          ? chat.name
          : chat.members?.find(m => m.id !== currentUserId)?.username;
        return chatName?.toLowerCase().includes(lowerSearch);
      });
    }

    setFilteredChats(filtered);
  }, [chats, filter, searchTerm]);

  // Listen for user online/offline status
  useEffect(() => {
    const handleStatus = (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    socketService.onUserStatus(handleStatus);

    return () => {
      socketService.offUserStatus(handleStatus);
    };
  }, []);

  // Listen for new messages to update unread count
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
      // Only increment if it's not our own message and not in the active chat
      if (
        message.sender_id !== currentUserId &&
        message.chat_id !== selectedUserIdRef.current
      ) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.chat_id]: (prev[message.chat_id] || 0) + 1,
        }));
      }
    };

    socketService.onNewMessage(handleNewMessage);
    return () => {
      socketService.socket?.off('message:new', handleNewMessage);
    };
  }, []);

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
    const otherUser = chat.members?.find(m => m.id !== currentUserId);
    return otherUser?.username || 'Unknown User';
  };

  const getOtherUser = (chat: Chat) => {
    if (chat.type === 'group') return null;
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
    return chat.members?.find(m => m.id !== currentUserId);
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  const getChatAvatar = (chat: Chat) => {
    return chat.type === 'group' ? '👥' : '👨';
  };

  const getLastMessage = (chat: Chat) => {
    if (!chat.last_message) return 'No messages yet';
    return chat.last_message.content;
  };

  const getTimestamp = (chat: Chat) => {
    if (!chat.last_message) return '';
    const date = new Date(chat.last_message.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 hover:bg-purple-200 transition overflow-hidden border border-purple-200"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="Me" className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-none">Messages</h1>
              <span className="text-[10px] text-gray-500">{filteredChats.length} active chats</span>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition transform hover:scale-110 active:scale-95"
              title="Add New"
            >
              <Plus size={18} strokeWidth={3} className={`transition-transform duration-300 ${showDropdown ? 'rotate-45' : ''}`} />
            </button>
  
            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDropdown(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      onRefresh();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2 transition"
                  >
                    <Search size={16} />
                    Refresh & Search
                  </button>
                  <button
                    onClick={() => {
                      onCreateGroup();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2 transition"
                  >
                    <Users size={16} />
                    Create New Group
                  </button>
                  <button
                    onClick={() => {
                      setShowUserSearch(!showUserSearch);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition ${showUserSearch ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'}`}
                  >
                    <UserPlus size={16} />
                    Add New Member
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search messages"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* User Search Component */}
      {showUserSearch && (
        <div className="animate-in slide-in-from-top duration-300">
          <UserSearch onInviteSent={() => {
            onRefresh();
            setShowUserSearch(false);
          }} />
        </div>
      )}

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle size={48} className="mb-2 opacity-50" />
            <p>No chats found</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const otherUser = getOtherUser(chat);
            const online = otherUser ? (isUserOnline(otherUser.id) || otherUser.is_online) : false;
            const unread = unreadCounts[chat.id] || 0;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectUser(chat.id, chat.type === 'direct' ? 'chat' : 'group')}
                className={`p-3 border-b border-gray-100 cursor-pointer transition hover:bg-gray-50 ${selectedUserId === chat.id
                  ? chat.type === 'group' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
                  : ''
                  }`}
              >
                <div className="flex gap-3 items-start">
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 bg-gradient-to-br rounded-full flex items-center justify-center text-xl overflow-hidden ${chat.type === 'group'
                      ? 'from-purple-400 to-purple-600'
                      : 'from-blue-400 to-blue-600'
                      }`}>
                      {chat.type === 'group' ? (
                        chat.avatar ? (
                          <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="text-white" size={24} />
                        )
                      ) : (
                        otherUser?.avatar ? (
                          <img src={otherUser.avatar} alt={otherUser.username} className="w-full h-full object-cover" />
                        ) : (
                          otherUser?.username?.[0]?.toUpperCase() || '👤'
                        )
                      )}
                    </div>
                    {/* Online Status Indicator */}
                    {chat.type === 'direct' && otherUser && (
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <h3 className={`font-medium text-sm truncate ${unread > 0 ? 'text-gray-900 font-semibold' : 'text-gray-900'}`}>
                        {getChatName(chat)}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-500">{getTimestamp(chat)}</span>
                        {unread > 0 && (
                          <span className="min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {getLastMessage(chat)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
    </div>
  );
}