// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/users/register',
  LOGIN: '/users/login',
  LOGOUT: '/users/logout',
  PROFILE: '/users/profile',

  // Users
  SEARCH_USERS: '/users/search',
  ALL_USERS: '/users/all',
  GET_USER: (id: string) => `/users/${id}`,

  // Chats
  CREATE_DIRECT_CHAT: '/chats/direct',
  CREATE_GROUP_CHAT: '/chats/group',
  GET_CHATS: '/chats',
  GET_CHAT: (chatId: string) => `/chats/${chatId}`,
  INVITE_TO_GROUP: '/chats/invite',

  // Messages
  SEND_MESSAGE: '/messages',
  GET_MESSAGES: (chatId: string) => `/messages/${chatId}`,
  MARK_AS_READ: (chatId: string) => `/messages/${chatId}/read`,
  UPDATE_STATUS: '/messages/status',
  UPLOAD_FILE: '/messages/upload',
  UPDATE_MESSAGE: (id: string) => `/messages/${id}`,
  DELETE_MESSAGE: (id: string) => `/messages/${id}`,

  // Invitations
  GET_INVITATIONS: '/invitations',
  RESPOND_INVITATION: '/invitations/respond',
};