import axios from '@/lib/axios';
import { API_ENDPOINTS } from '@/config/api';

export const chatService = {
  // Create direct chat
  createDirectChat: async (inviteeId: string) => {
    return await axios.post(API_ENDPOINTS.CREATE_DIRECT_CHAT, {
      invitee_id: inviteeId,
    });
  },

  // Create group chat
  createGroupChat: async (name: string, memberIds?: string[], avatar?: string) => {
    return await axios.post(API_ENDPOINTS.CREATE_GROUP_CHAT, {
      name,
      member_ids: memberIds,
      avatar,
    });
  },

  // Get all chats
  getChats: async () => {
    return await axios.get(API_ENDPOINTS.GET_CHATS);
  },

  // Get chat by ID
  getChatById: async (chatId: string) => {
    return await axios.get(API_ENDPOINTS.GET_CHAT(chatId));
  },

  // Invite to group
  inviteToGroup: async (chatId: string, inviteeId: string) => {
    return await axios.post(API_ENDPOINTS.INVITE_TO_GROUP, {
      chat_id: chatId,
      invitee_id: inviteeId,
    });
  },

  // Leave/Delete chat
  leaveChat: async (chatId: string) => {
    return await axios.delete(`${API_ENDPOINTS.GET_CHATS}/${chatId}/leave`);
  },
};