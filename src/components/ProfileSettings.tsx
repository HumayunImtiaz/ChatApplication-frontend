'use client';

import { useState, useRef } from 'react';
import { X, Camera, Save, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';
import { messageService } from '../services/messageService';

interface ProfileSettingsProps {
  onClose: () => void;
}

export default function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [username, setUsername] = useState(user.username || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // axios interceptor unwraps response, so result = { success, message, data: user }
      const result: any = await userService.updateProfile({ username, avatar });
      const updatedUser = result?.data || result;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
      onClose();
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      // axios interceptor unwraps response, result = { success, message, data: { url, ... } }
      const result: any = await messageService.uploadFile(file);
      const fileUrl = result?.data?.url;
      if (fileUrl) {
        setAvatar(fileUrl);
      } else {
        toast.error('Failed to get image URL from upload.');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(`Failed to upload image: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-600 text-white">
          <h2 className="text-xl font-bold">Profile Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-4xl text-white font-bold shadow-lg overflow-hidden border-4 border-white">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  username[0]?.toUpperCase() || '👤'
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-white text-purple-600 rounded-full shadow-lg border border-gray-200 hover:scale-110 transition active:scale-95"
              >
                <Camera size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
            <p className="text-sm text-gray-500">Click camera icon to change photo</p>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Display Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="Your username"
              required
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
