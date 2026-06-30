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

  const navBtn = (isActive: boolean) =>
    `w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
      isActive
        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
    }`;

  return (
    <div className="w-[72px] bg-white border-r border-slate-100 flex flex-col items-center py-5 gap-5 shadow-sm flex-shrink-0">
      {/* Avatar */}
      <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-violet-200 overflow-hidden flex-shrink-0">
        {currentUser?.avatar ? (
          <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
        ) : (
          currentUser?.username?.[0]?.toUpperCase() || 'U'
        )}
      </div>

      {/* Divider */}
      <div className="w-8 h-px bg-slate-100" />

      {/* Nav Tabs */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <button
          onClick={() => handleFilterClick('all')}
          className={navBtn(activeTab === 'messages' && chatFilter === 'all')}
          title="All Messages"
        >
          <Home size={20} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => onTabChange('invitations')}
          className={`${navBtn(activeTab === 'invitations')} relative`}
          title="Invitations"
        >
          <Bell size={20} strokeWidth={2.5} />
          {invitationCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold border-2 border-white leading-none">
              {invitationCount > 9 ? '9+' : invitationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleFilterClick('chats')}
          className={navBtn(activeTab === 'messages' && chatFilter === 'chats')}
          title="Direct Chats"
        >
          <MessageCircle size={20} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => handleFilterClick('groups')}
          className={navBtn(activeTab === 'messages' && chatFilter === 'groups')}
          title="Group Chats"
        >
          <Users size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => onTabChange('settings')}
          className={navBtn(activeTab === 'settings')}
          title="Settings"
        >
          <Settings size={20} strokeWidth={2.5} />
        </button>

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          title="Logout"
        >
          <LogOut size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}