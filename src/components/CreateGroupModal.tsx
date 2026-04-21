'use client';

import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Camera, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { userService } from '@/services/userService';
import { chatService } from '@/services/chatService';
import { messageService } from '@/services/messageService';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (chatId: string) => void;
}

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setSelectedUsers([]);
      setSearchTerm('');
      setAvatar(null);
      setAvatarPreview(null);
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      loadUsers();
      return;
    }
    setLoading(true);
    try {
      const response = await userService.searchUsers(query);
      setUsers(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm);
      } else if (isOpen) {
        loadUsers();
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setCreating(true);
    try {
      let avatarUrl = '';
      
      // Handle avatar upload if exists
      if (avatar) {
        try {
          const uploadRes = await messageService.uploadFile(avatar);
          avatarUrl = uploadRes.data.url;
        } catch (e) {
          console.error('Avatar upload failed:', e);
        }
      }

      const response = await chatService.createGroupChat(groupName, selectedUsers, avatarUrl);
      const chatId = response.data.chatId;

      onGroupCreated(chatId);
      onClose();
      toast.success('Group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-600 text-white">
          <h2 className="text-lg font-bold">Create New Group</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Group Info */}
          <div className="flex gap-4 items-center">
            <div className="relative group cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Group Name</label>
              <input
                type="text"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-0 py-2 text-lg font-medium border-b-2 border-gray-100 focus:border-purple-600 outline-none bg-transparent transition"
              />
            </div>
          </div>

          {/* Member Search */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Add Members ({selectedUsers.length})</label>
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent focus:border-purple-600 rounded-xl outline-none transition text-sm"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-4 text-gray-400 text-sm italic">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm italic">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedUsers.includes(user.id)
                        ? 'bg-purple-50 ring-1 ring-purple-200'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold overflow-hidden border border-purple-200">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.username}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${selectedUsers.includes(user.id)
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-gray-300'
                      }`}>
                      {selectedUsers.includes(user.id) && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={creating || !groupName.trim() || selectedUsers.length === 0}
            className="flex-1 px-4 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            {creating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                Create Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
