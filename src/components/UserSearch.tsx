'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  is_online: boolean;
}

interface UserSearchProps {
  onInviteSent: () => void;
  chatId?: string | null;
  mode?: 'direct' | 'group';
}

export default function UserSearch({ onInviteSent, chatId, mode = 'direct' }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Clear results when search term is empty
  useEffect(() => {
    if (!searchTerm.trim()) {
      setUsers([]);
    }
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      const response = await axios.get(`/users/search?query=${searchTerm}`);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (userId: string) => {
    try {
      setSending(userId);
      if (mode === 'direct') {
        await axios.post('/chats/direct', { invitee_id: userId });
      } else {
        await axios.post('/chats/invite', { chat_id: chatId, invitee_id: userId });
      }
      toast.success('Invitation sent!');
      setUsers([]);
      setSearchTerm('');
      onInviteSent();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {mode === 'direct' ? 'Add New Chat' : 'Add Member to Group'}
      </h3>
      
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!e.target.value.trim()) {
                setUsers([]);
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {users.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-white">
                  {user.avatar || user.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleInvite(user.id)}
                disabled={sending === user.id}
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <UserPlus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}