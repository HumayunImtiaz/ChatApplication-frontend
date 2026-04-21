'use client';

import { Home, MessageCircle, Users, Bell, Settings, LogOut } from 'lucide-react';
import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';

interface NavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  chatFilter: 'all' | 'chats' | 'groups';
  onChatFilterChange: (filter: 'all' | 'chats' | 'groups') => void;
  invitationCount?: number;
}

export default function NavBar({ 
  activeTab, 
  onTabChange, 
  chatFilter, 
  onChatFilterChange,
  invitationCount = 0 
}: NavBarProps) {
  const router = useRouter();
  const currentUser = authService.getCurrentUser();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleFilterClick = (filter: 'all' | 'chats' | 'groups') => {
    onTabChange('messages');
    onChatFilterChange(filter);
  };

  return (
    <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6 shadow-sm">
      {/* User Profile */}
      <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg border border-purple-100 shadow-sm">
        {currentUser?.avatar ? (
          <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover rounded-full" />
        ) : (
          currentUser?.username?.[0]?.toUpperCase() || 'U'
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 flex flex-col gap-4 w-full px-2">
        {/* Home (All Messages) */}
        <button
          onClick={() => handleFilterClick('all')}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${
            activeTab === 'messages' && chatFilter === 'all'
              ? 'bg-purple-50 text-purple-600 shadow-sm'
              : 'text-gray-800 hover:bg-gray-100'
          }`}
          title="All Messages"
        >
          <Home size={24} strokeWidth={2.5} />
        </button>

        {/* Invitations Tab */}
        <button
          onClick={() => onTabChange('invitations')}
          className={`p-3 rounded-xl transition-all relative flex items-center justify-center ${
            activeTab === 'invitations'
              ? 'bg-purple-50 text-purple-600 shadow-sm'
              : 'text-gray-800 hover:bg-gray-100'
          }`}
          title="Invitations"
        >
          <Bell size={24} strokeWidth={2.5} />
          {invitationCount > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold border-2 border-white">
              {invitationCount > 9 ? '9+' : invitationCount}
            </span>
          )}
        </button>

        {/* Direct Chats Filter */}
        <button
          onClick={() => handleFilterClick('chats')}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${
            activeTab === 'messages' && chatFilter === 'chats'
              ? 'bg-purple-50 text-purple-600 shadow-sm'
              : 'text-gray-800 hover:bg-gray-100'
          }`}
          title="Direct Chats"
        >
          <MessageCircle size={24} strokeWidth={2.5} />
        </button>

        {/* Groups Filter */}
        <button
          onClick={() => handleFilterClick('groups')}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${
            activeTab === 'messages' && chatFilter === 'groups'
              ? 'bg-purple-50 text-purple-600 shadow-sm'
              : 'text-gray-800 hover:bg-gray-100'
          }`}
          title="Group Chats"
        >
          <Users size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-4 px-2 w-full">
        {/* Settings Tab */}
        <button
          onClick={() => onTabChange('settings')}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${
            activeTab === 'settings'
              ? 'bg-purple-50 text-purple-600 shadow-sm'
              : 'text-gray-800 hover:bg-gray-100'
          }`}
          title="Settings"
        >
          <Settings size={24} strokeWidth={2.5} />
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-3 rounded-xl text-gray-800 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
          title="Logout"
        >
          <LogOut size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}