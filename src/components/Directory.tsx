'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, Download, Users, Mail, Clock, Paperclip, Trash2, FileText, ImageIcon, FileCode, Archive, UserPlus, Camera, Save, X, Edit2, Crown, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';
import { messageService } from '../services/messageService';
import { chatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import UserSearch from './UserSearch';

interface DirectoryProps {
  selectedUserId: string | null;
  selectedChat?: any;
  isGroup: boolean;
  onChatDeleted?: () => void;
  onMemberRemoved?: () => void;
}

export default function Directory({ selectedUserId, selectedChat, isGroup, onChatDeleted, onMemberRemoved }: DirectoryProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [localMembers, setLocalMembers] = useState<any[]>([]);
  const groupFileInputRef = useRef<HTMLInputElement>(null);
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

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      setIsSavingGroup(true);
      await chatService.updateGroupChat(selectedUserId, {
        name: editGroupName,
        avatar: editGroupAvatar,
      });
      toast.success('Group updated successfully!');
      setIsEditingGroup(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update group');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleGroupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsSavingGroup(true);
      const result: any = await messageService.uploadFile(file);
      const fileUrl = result?.data?.url || result?.url;
      if (fileUrl) {
        setEditGroupAvatar(fileUrl);
        toast.success('Image uploaded! Click Save to apply.');
      } else {
        toast.error('Failed to upload image.');
      }
    } catch (error: any) {
      toast.error('Failed to upload image: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedUserId) return;
    if (!window.confirm(`Remove ${memberName} from this group?`)) return;
    try {
      setRemovingMemberId(memberId);
      await chatService.removeMember(selectedUserId, memberId);
      setLocalMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success(`${memberName} has been removed from the group.`);
      if (onMemberRemoved) onMemberRemoved();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
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
        if (selectedChat) {
          setEditGroupName(selectedChat.name || '');
          setEditGroupAvatar(selectedChat.avatar || '');
          setLocalMembers(selectedChat.members || []);
        }
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
          content.includes('cloudinary.com/') ||
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
          size: '—'
        };
      });

      setSharedFiles(files);
    } catch (error) {
      console.error('Error loading shared files:', error);
    }
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case 'pdf': return { icon: <FileText size={18} className="text-red-500" />, bg: 'bg-red-50 border-red-100' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return { icon: <ImageIcon size={18} className="text-emerald-500" />, bg: 'bg-emerald-50 border-emerald-100' };
      case 'doc':
      case 'docx': return { icon: <FileCode size={18} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-100' };
      case 'zip':
      case 'rar': return { icon: <Archive size={18} className="text-amber-500" />, bg: 'bg-amber-50 border-amber-100' };
      default: return { icon: <Paperclip size={18} className="text-violet-500" />, bg: 'bg-violet-50 border-violet-100' };
    }
  };

  if (!selectedUserId) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6 text-center">
        <div>
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-violet-100 shadow-sm">
            <Users size={28} className="text-violet-300" />
          </div>
          <p className="text-slate-700 font-bold text-base">Chat Details</p>
          <p className="text-slate-400 text-sm mt-1">Select a chat to view details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isOnline = user?.is_online || onlineUsers.has(user?.id);
  const members = isGroup ? [...localMembers].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    if (a.id === currentUser.id) return -1;
    if (b.id === currentUser.id) return 1;
    return (a.username || '').localeCompare(b.username || '');
  }) : [];
  const currentUserRole = members.find((m: any) => m.id === currentUser.id)?.role;
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Direct Chat Profile */}
        {!isGroup && user && (
          <div className="p-6 border-b border-slate-100 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl text-white font-bold shadow-lg overflow-hidden border-4 border-white ring-2 ring-violet-100">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user.username?.[0]?.toUpperCase() || '👤'
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-0.5">{user.username}</h3>
            <p className="text-sm text-slate-500 font-medium mb-5">{user.role || 'Team Member'}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                <p className="text-xs font-bold text-slate-700 truncate">{user.email || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Joined</p>
                <p className="text-xs font-bold text-slate-700">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Group Profile */}
        {isGroup && selectedChat && (
          <div className="p-6 border-b border-slate-100 text-center relative group/header">
            {isEditingGroup ? (
              <form onSubmit={handleUpdateGroup} className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl mb-3 border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Edit Group</h3>
                  <button type="button" onClick={() => setIsEditingGroup(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition">
                    <X size={15} />
                  </button>
                </div>

                <div className="relative inline-block mb-2">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl text-white font-bold shadow-md overflow-hidden border-4 border-white mx-auto">
                    {editGroupAvatar ? (
                      <img src={editGroupAvatar} alt="Group Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={28} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => groupFileInputRef.current?.click()}
                    disabled={isSavingGroup}
                    className="absolute -bottom-2 -right-2 p-1.5 bg-white text-violet-600 rounded-xl shadow-lg border border-slate-200 hover:scale-110 transition disabled:opacity-50"
                  >
                    {isSavingGroup ? (
                      <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                  <input type="file" ref={groupFileInputRef} onChange={handleGroupFileChange} className="hidden" accept="image/*" />
                </div>

                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-bold text-center text-sm"
                  placeholder="Group Name"
                  required
                />

                <button
                  type="submit"
                  disabled={isSavingGroup}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-indigo-700 transition flex items-center justify-center gap-2 shadow-sm shadow-violet-200 disabled:opacity-50 text-sm"
                >
                  <Save size={15} />
                  {isSavingGroup ? 'Saving...' : 'Save Details'}
                </button>
              </form>
            ) : (
              <>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingGroup(true)}
                    className="absolute top-4 right-4 p-1.5 bg-white text-slate-400 hover:text-violet-600 rounded-xl shadow-sm border border-slate-100 opacity-0 group-hover/header:opacity-100 transition transform hover:scale-110"
                    title="Edit Group"
                  >
                    <Edit2 size={14} />
                  </button>
                )}

                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl text-white font-bold shadow-lg overflow-hidden border-4 border-white ring-2 ring-violet-100 mx-auto">
                    {selectedChat.avatar ? (
                      <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={36} />
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-0.5">{selectedChat.name}</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">Group Chat</p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <Clock size={13} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500">
                    {selectedChat.created_at ? new Date(selectedChat.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Team Members Section */}
        {isGroup && (
          <section className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Members</h3>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">{members.length}</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl transition text-xs font-bold border border-violet-100"
                  title="Add New Member"
                >
                  <UserPlus size={14} />
                  Add
                </button>
              )}
            </div>

            <div className="space-y-2">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition group/member">
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold overflow-hidden text-sm border ${
                      member.role === 'admin' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                      ) : (
                        member.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      member.is_online || onlineUsers.has(member.id) ? 'bg-emerald-500' : 'bg-slate-300'
                    }`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-800 text-sm truncate">{member.username}</p>
                      {member.role === 'admin' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-600 text-white text-[9px] font-bold rounded-md uppercase tracking-wide flex-shrink-0">
                          <Crown size={8} />
                          Admin
                        </span>
                      )}
                      {member.id === currentUser.id && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] uppercase font-bold text-slate-500 rounded-md flex-shrink-0">You</span>
                      )}
                    </div>
                    <p className={`text-xs font-medium mt-0.5 ${member.role === 'admin' ? 'text-violet-500' : 'text-slate-400'}`}>
                      {member.role === 'admin' ? 'Administrator' : member.role === 'pending' ? 'Invited' : 'Member'}
                    </p>
                  </div>

                  {/* Remove button - only for admins on non-self, non-pending members */}
                  {isAdmin && member.id !== currentUser.id && member.role !== 'pending' && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.username)}
                      disabled={removingMemberId === member.id}
                      className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-700 rounded-lg transition flex-shrink-0 border border-transparent hover:border-red-100"
                      title={`Remove ${member.username}`}
                    >
                      {removingMemberId === member.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserMinus size={14} />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shared Files Section */}
        <section className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Shared Files</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{sharedFiles.length}</span>
          </div>

          {sharedFiles.length === 0 ? (
            <div className="text-center py-8 bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-100">
              <Download size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No shared files yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sharedFiles.map((file) => {
                const style = getFileIcon(file.extension);
                return (
                  <div key={file.id} className="flex items-center gap-3 group p-2 rounded-xl hover:bg-slate-50 transition">
                    <div className={`w-10 h-10 rounded-xl ${style.bg} border flex items-center justify-center shadow-sm flex-shrink-0`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold text-slate-800 truncate hover:text-violet-600 cursor-pointer transition"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        {file.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {file.extension}
                      </p>
                    </div>
                    <a
                      href={file.url}
                      download
                      target="_blank"
                      className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-violet-600 hover:text-white transition shadow-sm flex-shrink-0"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Danger Zone */}
      <div className="p-4 border-t border-slate-100 bg-white">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-xl transition font-bold border border-transparent hover:border-red-100 text-sm group"
          >
            <Trash2 size={16} className="group-hover:scale-110 transition" />
            {isGroup ? 'Leave Group' : 'Delete Conversation'}
          </button>
        ) : (
          <div>
            <p className="text-xs font-bold text-slate-700 text-center mb-3">Are you sure? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 p-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                className="flex-1 p-2.5 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition shadow-lg shadow-red-100"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden relative shadow-2xl border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm">Add Team Member</h3>
              <button
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition"
                onClick={() => setShowAddMember(false)}
              >
                <X size={16} />
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
