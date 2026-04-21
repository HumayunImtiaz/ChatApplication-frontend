import axios from '../lib/axios';
import { API_ENDPOINTS } from '../config/api';

export const userService = {
  // Get all users
  getAllUsers: async () => {
    return await axios.get(API_ENDPOINTS.ALL_USERS);
  },

  // Get user by ID
  getUserById: async (id: string) => {
    return await axios.get(API_ENDPOINTS.GET_USER(id));
  },

  // Search users
  searchUsers: async (query: string) => {
    return await axios.get(`${API_ENDPOINTS.SEARCH_USERS}?query=${query}`);
  },

  // Get user profile
  getProfile: async () => {
    return await axios.get(API_ENDPOINTS.PROFILE);
  },

  // Update user profile
  updateProfile: async (data: { username?: string; avatar?: string }) => {
    return await axios.patch(API_ENDPOINTS.PROFILE, data);
  },
};

export default userService;
