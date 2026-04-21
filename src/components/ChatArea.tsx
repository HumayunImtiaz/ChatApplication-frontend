'use client';

import { useState, useEffect, useRef } from 'react';
import { Paperclip, Send, ArrowLeft, Users, Check, CheckCheck, MoreVertical, Trash2, Clock, Info, FileText, ImageIcon, Reply } from 'lucide-react';
import toast from 'react-hot-toast';
import { messageService } from '../services/messageService';
import { socketService } from '../services/socketService';
import Directory from './Directory';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  reply_to?: string;
  reply_content?: string;
  reply_user?: string;
}

interface ChatAreaProps {
  selectedUserId: string | null;
  selectedChat?: any;
  selectedType?: 'chat' | 'group' | null;
  onBackClick?: () => void;
  onShowMembers?: () => void;
  onChatDeleted?: () => void;
  showBackButton?: boolean;
}

export default function ChatArea({
  selectedUserId,
  selectedChat,
  selectedType,
  onBackClick,
  onShowMembers,
  onChatDeleted,
  showBackButton
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showDirectoryOverlay, setShowDirectoryOverlay] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Listen for user online status
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

  const getOtherUser = () => {
    if (!selectedChat || selectedChat.type === 'group') return null;
    return selectedChat.members?.find((m: any) => m.id !== currentUser.id);
  };

  const otherUser = getOtherUser();
  const isOnline = otherUser?.is_online || onlineUsers.has(otherUser?.id);

  // Load messages when chat selected
  useEffect(() => {
    if (selectedUserId) {
      loadMessages();
      socketService.joinChat(selectedUserId);

      // Check if it's a pending direct chat
      if (selectedType === 'chat' && selectedChat) {
        setIsPending(selectedChat.members?.length < 2);
      } else {
        setIsPending(false);
      }

      // Mark as read
      messageService.markAsRead(selectedUserId).catch(console.error);
    }

    return () => {
      if (selectedUserId) {
        socketService.leaveChat(selectedUserId);
      }
    };
  }, [selectedUserId]);

  // Listen for new messages, edits, and deletions
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      if (message.chat_id === selectedUserId) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });

        if (message.sender_id !== currentUser.id) {
          if (selectedUserId) {
            messageService.markAsRead(selectedUserId).catch(console.error);
            socketService.markAsRead(selectedUserId);
          }
        }
      }
    };

    const handleMessageUpdated = (updatedMsg: any) => {
      if (updatedMsg.chat_id === selectedUserId) {
        setMessages(prev => prev.map(msg => msg.id === updatedMsg.id ? { ...msg, content: updatedMsg.content } : msg));
      }
    };

    const handleMessageDeleted = (data: any) => {
      if (data.chatId === selectedUserId) {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.socket?.on('message:updated', handleMessageUpdated);
    socketService.socket?.on('message:deleted', handleMessageDeleted);
    
    // Typing indicators
    const handleTypingStart = (data: { userId: string; chatId: string }) => {
      if (data.chatId === selectedUserId && data.userId !== currentUser.id) {
        setTypingUsers(prev => new Set(prev).add(data.userId));
      }
    };

    const handleTypingStop = (data: { userId: string; chatId: string }) => {
      if (data.chatId === selectedUserId) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };

    socketService.onTyping(handleTypingStart);
    socketService.onStopTyping(handleTypingStop);

    return () => {
      socketService.socket?.off('message:new', handleNewMessage);
      socketService.socket?.off('message:updated', handleMessageUpdated);
      socketService.socket?.off('message:deleted', handleMessageDeleted);
      socketService.socket?.off('typing:user-typing', handleTypingStart);
      socketService.socket?.off('typing:user-stopped', handleTypingStop);
    };
  }, [selectedUserId, currentUser.id]);

  // Listen for message status updates
  useEffect(() => {
    const handleStatusUpdate = (data: any) => {
      if (data.chatId && data.chatId !== selectedUserId) return;

      setMessages(prev =>
        prev.map(msg => {
          if (data.messageIds && data.messageIds.includes(msg.id)) {
            return { ...msg, status: data.status };
          }
          if (data.messageId && msg.id === data.messageId) {
            return { ...msg, status: data.status };
          }
          return msg;
        })
      );
    };

    socketService.socket?.on('message:status-updated', handleStatusUpdate);
    socketService.socket?.on('message:all-read', (data: any) => {
      if (data.chatId === selectedUserId) {
        setMessages(prev => prev.map(msg =>
          msg.sender_id === currentUser.id ? { ...msg, status: 'read' } : msg
        ));
      }
    });

    return () => {
      socketService.socket?.off('message:status-updated', handleStatusUpdate);
      socketService.socket?.off('message:all-read');
    };
  }, [selectedUserId, currentUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      const response = await messageService.getMessages(selectedUserId);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset typing indicators when switching chats
  useEffect(() => {
    setTypingUsers(new Set());
  }, [selectedUserId]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    if (!selectedUserId) return;

    // Emit typing:start
    socketService.startTyping(selectedUserId);

    // Reset stop timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(selectedUserId);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingFiles.length === 0) || !selectedUserId || sending) return;

    const messageContent = newMessage.trim();
    if (!messageContent && pendingFiles.length === 0) return;

    setNewMessage('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);
    setSending(true);

    try {
      // 1. Upload pending files if any
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const result: any = await messageService.uploadFile(file);
          const fileUrl = result?.data?.url || result?.url;
          if (fileUrl) {
            await messageService.sendMessage(selectedUserId, fileUrl, replyId);
          }
        }
        setPendingFiles([]);
      }

      // 2. Send text message if any
      if (messageContent) {
        await messageService.sendMessage(selectedUserId, messageContent, replyId);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to send message';
      console.error('Full Error Details:', {
        message: errorMsg,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(errorMsg);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessageId || !editContent.trim()) return;
    try {
      await messageService.updateMessage(editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await messageService.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isImageUrl = (url: string) => {
    return url.match(/\.(jpeg|jpg|gif|png)$/) != null || url.includes('/uploads/') && (url.toLowerCase().endsWith('.png') || url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg') || url.toLowerCase().endsWith('.gif'));
  };

  const renderMessageContent = (msg: Message) => {
    const { content } = msg;
    if (content.startsWith('http') && isImageUrl(content)) {
      return (
        <div className="mt-1">
          <img
            src={content}
            alt="Sent file"
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition"
            onClick={() => window.open(content, '_blank')}
          />
        </div>
      );
    }

    if (content.startsWith('http') && content.includes('/uploads/')) {
      const fileName = content.split('/').pop() || 'File';
      return (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition mt-1 underline"
        >
          <Paperclip size={16} />
          <span className="text-sm truncate max-w-[200px]">{fileName}</span>
        </a>
      );
    }

    return <p className="text-sm break-words whitespace-pre-wrap">{content}</p>;
  };

  const MessageStatusIcon = ({ status }: { status: string }) => {
    if (status === 'sent') return <Check size={14} className="text-gray-400 opacity-50" />;
    if (status === 'delivered') return <CheckCheck size={14} className="text-gray-400 opacity-50" />;
    if (status === 'read') return <CheckCheck size={14} className="text-blue-400" />;
    return null;
  };

  if (!selectedUserId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-5xl mx-auto mb-6 ring-1 ring-gray-100">💬</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Chat</h3>
          <p className="text-gray-500 max-w-xs mx-auto">Select a conversation from the sidebar to start messaging your team.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button onClick={onBackClick} className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition text-gray-600">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="relative group cursor-pointer">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold overflow-hidden shadow-sm ${selectedType === 'group' ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'
              }`}>
              {selectedType === 'group' ? (
                selectedChat?.avatar ? (
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
                ) : (
                  <Users size={22} />
                )
              ) : (
                otherUser?.avatar ? (
                  <img src={otherUser.avatar} alt={otherUser.username} className="w-full h-full object-cover" />
                ) : (
                  otherUser?.username?.[0]?.toUpperCase() || '?'
                )
              )}
            </div>
            {selectedType !== 'group' && (
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
            )}
          </div>
          <div className="min-w-0 cursor-pointer hover:opacity-80 transition" onClick={() => setShowUserProfile(true)}>
            <h2 className="font-bold text-gray-900 leading-tight truncate">
              {selectedType === 'group' ? selectedChat?.name : otherUser?.username || 'Chat'}
            </h2>
            <div className="flex items-center gap-1.5">
              {typingUsers.size > 0 ? (
                <p className="text-[10px] sm:text-xs text-purple-600 font-bold animate-pulse">
                  {selectedType === 'group' 
                    ? `${selectedChat?.members?.find((m: any) => typingUsers.has(m.id))?.username} is typing...`
                    : 'typing...'
                  }
                </p>
              ) : (
                <>
                  {selectedType !== 'group' && <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />}
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                    {selectedType === 'group' ? `${selectedChat?.members?.length || 0} members` : (isOnline ? 'Online' : 'Offline')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className={`p-2.5 hover:bg-gray-100 rounded-xl transition text-gray-600 ${showOptionsMenu ? 'bg-gray-100 text-purple-600' : ''}`}
          >
            <MoreVertical size={20} />
          </button>

          {/* Options Dropdown */}
          {showOptionsMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowOptionsMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    setShowDirectoryOverlay(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <Users size={16} />
                  View Details
                </button>
                <button
                  onClick={() => {
                    setShowDirectoryOverlay(true); // Open directory overlay which has the delete button
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t border-gray-50 mt-1"
                >
                  <Trash2 size={16} />
                  Delete Chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overlay for User Profile (mobile/tablet) */}
      {showUserProfile && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative animate-in zoom-in duration-200 shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">User Profile</h3>
              <button
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
                onClick={() => setShowUserProfile(false)}
              >
                ✕
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <Directory selectedUserId={selectedUserId} selectedChat={selectedChat} isGroup={selectedType === 'group'} onChatDeleted={() => {
                setShowUserProfile(false);
                onChatDeleted?.();
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Overlay for Directory Details (mobile/tablet) */}
      {showDirectoryOverlay && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative animate-in zoom-in duration-200 shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Conversation Details</h3>
              <button
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
                onClick={() => setShowDirectoryOverlay(false)}
              >
                ✕
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <Directory selectedUserId={selectedUserId} selectedChat={selectedChat} isGroup={selectedType === 'group'} onChatDeleted={() => {
                setShowDirectoryOverlay(false);
                onChatDeleted?.();
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitation Banner */}
      {isPending && (
        <div className="bg-amber-50 border-b border-amber-100 p-3 text-center animate-in slide-in-from-top duration-300">
          <p className="text-sm text-amber-700 font-medium flex items-center justify-center gap-2">
            <Clock size={16} />
            Invitation not accepted yet. You can start chatting once they accept.
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/30 custom-scrollbar">
        {messages.map((msg) => {
          const isSent = msg.sender_id === currentUser.id;
          const isEditing = editingMessageId === msg.id;

          return (
            <div key={msg.id} className={`flex gap-3 group/msg ${isSent ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 duration-300`}>
              {/* Avatar */}
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold overflow-hidden border shadow-sm self-end mb-1 ${isSent ? 'bg-purple-100 text-purple-600 border-purple-100' : 'bg-white text-blue-600 border-gray-100'
                }`}>
                {isSent ? (
                  currentUser.avatar ? <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" /> : currentUser.username?.[0]?.toUpperCase()
                ) : (
                  msg.sender_avatar ? <img src={msg.sender_avatar} alt={msg.sender_name} className="w-full h-full object-cover" /> : msg.sender_name?.[0]?.toUpperCase()
                )}
              </div>

              {/* Message Bubble Container */}
              <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                {!isSent && <span className="text-[10px] font-bold text-gray-400 ml-1 mb-1 uppercase tracking-wider">{msg.sender_name}</span>}

                <div className={`group/actions flex items-end gap-2 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Bubble */}
                  <div className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 relative ${isSent
                    ? 'bg-purple-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                    }`}>

                    {msg.reply_to && (msg.reply_content || msg.reply_user) && (
                      <div className={`mb-2 p-2 rounded-lg border-l-2 text-[11px] max-w-full ${
                        isSent ? 'bg-black/20 border-white/50 text-white/90' : 'bg-gray-50 border-purple-500 text-gray-500'
                      }`}>
                        <p className="font-bold text-[9px] uppercase tracking-widest mb-0.5">
                          {msg.reply_user === currentUser.username ? 'You' : (msg.reply_user || 'Unknown')}
                        </p>
                        <p className="truncate italic">
                          {msg.reply_content || 'Message not available'}
                        </p>
                      </div>
                    )}

                    {isEditing ? (
                      <form onSubmit={handleUpdateMessage} className="min-w-[180px] sm:min-w-[240px]">
                        <textarea
                          autoFocus
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-white/10 text-white border-none focus:ring-0 resize-none text-sm p-0 mb-2 placeholder:text-white/50"
                          rows={2}
                        />
                        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                          <button type="button" onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold uppercase tracking-widest text-purple-200 hover:text-white transition">Cancel</button>
                          <button type="submit" className="text-[10px] font-bold uppercase tracking-widest text-white hover:scale-105 transition">Save Changes</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {renderMessageContent(msg)}
                        <div className={`flex items-center gap-1.5 mt-1.5 ${isSent ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] font-bold tracking-tighter ${isSent ? 'text-purple-200/80' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isSent && <MessageStatusIcon status={msg.status} />}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reply Button - only on OTHER user's messages */}
                  {!isEditing && !isSent && (
                    <div className="opacity-100 sm:opacity-0 sm:group-hover/msg:opacity-100 flex items-center transition-all duration-200 flex-shrink-0">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1.5 hover:bg-gray-200 rounded-full text-purple-600 bg-white shadow-sm border border-gray-100 transition"
                        title="Reply"
                      >
                        <Reply size={14} />
                      </button>
                    </div>
                  )}

                  {/* Edit/Delete Buttons - only on OWN messages */}
                  {!isEditing && isSent && (
                    <div className="opacity-100 sm:opacity-0 sm:group-hover/msg:opacity-100 flex items-center gap-1 transition-all duration-200 flex-shrink-0">
                      <button
                        onClick={() => handleEditMessage(msg)}
                        className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 bg-white shadow-sm border border-gray-100 transition"
                        title="Edit message"
                      >
                        <MoreVertical size={14} className="rotate-90" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1.5 hover:bg-red-50 rounded-full text-red-500 bg-white shadow-sm border border-red-100 transition"
                        title="Delete for everyone"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-gray-50 rounded-2xl border-l-4 border-purple-500 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-0.5">Replying to {replyingTo.sender_name}</p>
              <p className="text-xs text-gray-600 truncate">{replyingTo.content}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition">
              ✕
            </button>
          </div>
        )}

        {/* File Preview Area */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-bottom-2 duration-300">
            {pendingFiles.map((file, idx) => (
              <div key={idx} className="relative group bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  {file.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                </div>
                <div className="max-w-[120px]">
                  <p className="text-[10px] font-bold text-gray-900 truncate">{file.name}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={() => removePendingFile(idx)}
                  className="p-1 hover:bg-red-50 text-red-400 rounded-md transition"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={triggerFileInput}
              className="px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-purple-600 hover:border-purple-200 transition text-xs font-bold"
            >
              + Add More
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-end max-w-6xl mx-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
          <button
            type="button"
            onClick={triggerFileInput}
            className="p-3 sm:p-3.5 hover:bg-purple-50 rounded-2xl transition text-gray-400 hover:text-purple-600 border border-transparent hover:border-purple-100"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 relative">
            <textarea
              placeholder={isPending ? "Invitation not accepted yet..." : "Message..."}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className={`w-full px-5 py-3 sm:py-3.5 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 resize-none text-sm placeholder:text-gray-400 transition ${isPending ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 text-gray-900'
                }`}
              rows={1}
              disabled={isPending || sending}
            />
          </div>

          <button
            type="submit"
            disabled={(!newMessage.trim() && pendingFiles.length === 0) || sending || isPending}
            className="p-3.5 sm:p-4 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200 hover:bg-purple-700 hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            <Send size={20} fill="currentColor" />
          </button>
        </form>
      </div>
    </div>
  );
}