import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';

class SocketService {
  public socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(API_CONFIG.SOCKET_URL, {
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join chat room
  joinChat(chatId: string) {
    this.socket?.emit('chat:join', { chatId });
  }

  // Leave chat room
  leaveChat(chatId: string) {
    this.socket?.emit('chat:leave', { chatId });
  }

  // Send message
  sendMessage(chatId: string, content: string) {
    this.socket?.emit('message:send', { chatId, content });
  }

  // Listen for new messages — use .on() (caller must manage cleanup via .off())
  onNewMessage(callback: (message: any) => void) {
    // Remove existing before adding to prevent duplicates
    this.socket?.off('message:new', callback);
    this.socket?.on('message:new', callback);
  }

  // Remove new message listener
  offNewMessage(callback: (message: any) => void) {
    this.socket?.off('message:new', callback);
  }

  // Listen for user online/offline
  onUserStatus(callback: (data: { userId: string; isOnline: boolean }) => void) {
    this.socket?.off('user:online', callback);
    this.socket?.on('user:online', callback);
  }

  // Remove user status listener
  offUserStatus(callback: (data: { userId: string; isOnline: boolean }) => void) {
    this.socket?.off('user:online', callback);
  }

  // Start typing
  startTyping(chatId: string) {
    this.socket?.emit('typing:start', { chatId });
  }

  // Stop typing
  stopTyping(chatId: string) {
    this.socket?.emit('typing:stop', { chatId });
  }

  // Listen for typing
  onTyping(callback: (data: { userId: string; chatId: string }) => void) {
    this.socket?.on('typing:user-typing', callback);
  }

  // Listen for stop typing
  onStopTyping(callback: (data: { userId: string; chatId: string }) => void) {
    this.socket?.on('typing:user-stopped', callback);
  }

  // Mark messages as read
  markAsRead(chatId: string) {
    this.socket?.emit('message:read-all', { chatId });
  }

  // Listen for invitation
  onInvitation(callback: (invitation: any) => void) {
    this.socket?.on('invitation:received', callback);
  }

  // Listen for new chat (invitation accepted)
  onChatNew(callback: (chat: any) => void) {
    this.socket?.on('chat:new', callback);
  }

  // Remove new chat listener
  offChatNew(callback: (chat: any) => void) {
    this.socket?.off('chat:new', callback);
  }
}

export const socketService = new SocketService();