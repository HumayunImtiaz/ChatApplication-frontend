'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, MoreVertical, Download, Users, Mail, Clock, Paperclip, Trash2, FileText, ImageIcon, FileCode, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';
import { messageService } from '../services/messageService';
import { chatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import UserSearch from './UserSearch';
import { UserPlus } from 'lucide-react';

interface DirectoryProps {
  selectedUserId: string | null;
  selectedChat?: any;
  isGroup: boolean;
  onChatDeleted?: () => void;
}

export default function Directory({ selectedUserId, selectedChat, isGroup, onChatDeleted }: DirectoryProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleDeleteChat = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      await chatService.leaveChat(selectedUserId);
      setShowDeleteConfirm(false);
      if (onChatDeleted) {
        onChatDeleted();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat.');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (selectedUserId) {
      if (!isGroup) {
        let targetUserId: string | null = null;
        if (selectedChat && selectedChat.type === 'direct') {
          const otherMember = selectedChat.members?.find((m: any) => m.id !== currentUser.id);
          if (otherMember) {
            targetUserId = otherMember.id;
          }
        }

        if (targetUserId) {
          const isNewUser = targetUserId !== lastUserIdRef.current;
          loadUserData(targetUserId, isNewUser);
          lastUserIdRef.current = targetUserId;
        } else {
          setUser(null);
          lastUserIdRef.current = null;
        }
      } else {
        setUser(null);
        lastUserIdRef.current = null;
      }

      loadSharedFiles(selectedUserId);
    } else {
      setUser(null);
      lastUserIdRef.current = null;
      setSharedFiles([]);
    }
  }, [selectedUserId, isGroup, selectedChat]);

  const loadUserData = async (targetUserId: string, showLoader: boolean) => {
    try {
      if (showLoader) setLoading(true);
      const response: any = await userService.getUserById(targetUserId);
      setUser(response?.data || response);
    } catch (error) {
      console.error('Error loading user data for directory:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadSharedFiles = async (chatId: string) => {
    try {
      const response: any = await messageService.getMessages(chatId);
      const messages = response?.data || response || [];

      const files = messages.filter((m: any) => {
        const content = m.content || '';
        return content.startsWith('http') && (
          content.includes('/uploads/') ||
          /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|zip)$/i.test(content)
        );
      }).map((m: any) => {
        const fileName = m.content.split('/').pop() || 'file';
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        return {
          id: m.id,
          url: m.content,
          name: fileName,
          extension,
          date: m.created_at,
          size: '2.4 MB' // Mock size
        };
      });

      setSharedFiles(files);
    } catch (error) {
      console.error('Error loading shared files:', error);
    }
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case 'pdf': return { icon: <FileText size={20} className="text-red-500" />, bg: 'bg-red-50' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return { icon: <ImageIcon size={20} className="text-green-500" />, bg: 'bg-green-50' };
      case 'doc':
      case 'docx': return { icon: <FileCode size={20} className="text-blue-500" />, bg: 'bg-blue-50' };
      case 'zip':
      case 'rar': return { icon: <Archive size={20} className="text-orange-500" />, bg: 'bg-orange-50' };
      default: return { icon: <Paperclip size={20} className="text-purple-500" />, bg: 'bg-purple-50' };
    }
  };

  if (!selectedUserId) {
    return (
      <div className="h-screen w-[380px] bg-white border-l border-gray-100 flex items-center justify-center p-6 text-center">
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
            <Users size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-900 font-bold text-lg">Chat Details</p>
          <p className="text-gray-500 text-sm mt-1">Select a chat to view members and shared files</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-[380px] bg-white border-l border-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isOnline = user?.is_online || onlineUsers.has(user?.id);
  const members = isGroup ? (selectedChat?.members || []) : [];

  return (
    <div className="h-screen w-[380px] flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
      {/* Directory Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h2 className="text-2xl font-extrabold text-gray-900">Directory</h2>

      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Direct Chat Profile Header */}
        {!isGroup && user && (
          <div className="p-8 border-b border-gray-100 text-center animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="relative inline-block mb-4">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl text-white font-bold shadow-xl overflow-hidden border-4 border-white">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user.username?.[0]?.toUpperCase() || '👤'
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-4 border-white shadow-md ${
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-1">{user.username}</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">{user.role || 'Team Member'}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-2xl text-left border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                <p className="text-xs font-bold text-gray-700 truncate">{user.email || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl text-left border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Joined</p>
                <p className="text-xs font-bold text-gray-700">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Team Members Section (Only for Groups) */}
        {isGroup && (
          <section className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Team Members</h3>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">{members.length}</span>
              </div>
              <button 
                onClick={() => setShowAddMember(true)}
                className="p-2 hover:bg-purple-50 text-purple-600 rounded-xl transition group/add"
                title="Add New Member"
              >
                <UserPlus size={18} className="group-hover/add:scale-110 transition" />
              </button>
            </div>

            <div className="space-y-5">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center gap-4 group cursor-pointer">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold overflow-hidden shadow-sm border border-gray-100">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                      ) : (
                        member.username?.[0]?.toUpperCase() || '👤'
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                      member.is_online || onlineUsers.has(member.id) ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate group-hover:text-purple-600 transition">{member.username}</p>
                    <p className="text-xs text-gray-500 font-medium truncate">{member.role || (member.id === currentUser.id ? 'Me' : 'Member')}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Files Section */}
        <section className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-sm font-bold text-gray-900">Files</h3>
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">{sharedFiles.length}</span>
          </div>

          {sharedFiles.length === 0 ? (
            <div className="text-center py-10 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
              <Download size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No shared files found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedFiles.map((file) => {
                const style = getFileIcon(file.extension);
                return (
                  <div key={file.id} className="flex items-center gap-4 group">
                    <div className={`w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center shadow-sm`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-purple-600 cursor-pointer" onClick={() => window.open(file.url, '_blank')}>
                        {file.name}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {file.extension} • {file.size}
                      </p>
                    </div>
                    <a 
                      href={file.url} 
                      download 
                      target="_blank" 
                      className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition shadow-sm"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Danger Zone */}
      <div className="p-6 border-t border-gray-100 bg-white">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-3.5 text-red-600 hover:bg-red-50 rounded-2xl transition font-bold border border-transparent hover:border-red-100 shadow-sm group"
          >
            <Trash2 size={18} className="group-hover:scale-110 transition" />
            Delete Conversation
          </button>
        ) : (
          <div className="animate-in zoom-in duration-200">
            <p className="text-xs font-bold text-gray-900 text-center mb-3">Are you sure? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 p-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                className="flex-1 p-3 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition shadow-lg shadow-red-100"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative animate-in zoom-in duration-200 shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Add Team Member</h3>
              <button 
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
                onClick={() => setShowAddMember(false)}
              >
                ✕
              </button>
            </div>
            <UserSearch 
              mode="group" 
              chatId={selectedUserId} 
              onInviteSent={() => {
                setShowAddMember(false);
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
