import axios from '@/lib/axios';
import { API_ENDPOINTS } from '@/config/api';

export const messageService = {
  // Send message
  sendMessage: async (chatId: string, content: string, replyTo?: string) => {
    return await axios.post(API_ENDPOINTS.SEND_MESSAGE, {
      chat_id: chatId,
      content,
      reply_to: replyTo,
    });
  },

  // Get messages
  getMessages: async (chatId: string, limit = 50, offset = 0) => {
    return await axios.get(
      `${API_ENDPOINTS.GET_MESSAGES(chatId)}?limit=${limit}&offset=${offset}`
    );
  },

  // Mark as read
  markAsRead: async (chatId: string) => {
    return await axios.patch(API_ENDPOINTS.MARK_AS_READ(chatId));
  },

  // Update message status
  updateStatus: async (messageIds: string[], status: 'delivered' | 'read') => {
    return await axios.patch(API_ENDPOINTS.UPDATE_STATUS, {
      message_ids: messageIds,
      status,
    });
  },

  // Upload file
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await axios.post(API_ENDPOINTS.UPLOAD_FILE, formData);
  },

  // Update message
  updateMessage: async (id: string, content: string) => {
    return await axios.put(API_ENDPOINTS.UPDATE_MESSAGE(id), { content });
  },

  // Delete message
  deleteMessage: async (id: string) => {
    return await axios.delete(API_ENDPOINTS.DELETE_MESSAGE(id));
  },
};