'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import toast from 'react-hot-toast';
import ChatList from '@/components/ChatList';
import ChatArea from '@/components/ChatArea';
import Directory from '@/components/Directory';
import Invitations from '@/components/Invitations';
import ProfileSettings from '@/components/ProfileSettings';
import { authService } from '@/services/authService';
import { socketService } from '@/services/socketService';
import { chatService } from '@/services/chatService';
import CreateGroupModal from '@/components/CreateGroupModal';
import axios from '@/lib/axios';

export default function Home() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'chat' | 'group' | null>(null);
  const [activeTab, setActiveTab] = useState('messages');
  const [chatFilter, setChatFilter] = useState<'all' | 'chats' | 'groups'>('all');
  const [showChatListOnMobile, setShowChatListOnMobile] = useState(true);
  const [showMembersOnMobile, setShowMembersOnMobile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationCount, setInvitationCount] = useState(0);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [invitationsRefreshTrigger, setInvitationsRefreshTrigger] = useState(0);

  // Check authentication
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Connect socket
    const token = authService.getToken();
    if (token) {
      socketService.connect(token);
    }

    // Load initial data
    loadChats();
    loadInvitationCount();

    // Listen for socket events
    socketService.onNewMessage((message: any) => {
      console.log('New message received:', message);
      loadChats(true); // Silent reload
    });

    socketService.onInvitation((invitation: any) => {
      console.log('New invitation received:', invitation);
      loadInvitationCount(); // Update invitation count
      setInvitationsRefreshTrigger(prev => prev + 1); // Trigger Invitations list refresh
      toast.success(`New invitation from ${invitation.inviter_username}`);
    });

    socketService.onChatNew((chat: any) => {
      console.log('New chat created:', chat);
      loadChats(true); // Silent reload to show new chat in list
      toast.success(`Chat started with ${chat.type === 'group' ? chat.name : 'a new user'}`);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [router]);

  // Load chats from backend
  const loadChats = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response: any = await chatService.getChats();
      // axios interceptor unwraps response.data, so response = { success, data: [...chats] }
      setChats(response?.data || response || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Load invitation count
  const loadInvitationCount = async () => {
    try {
      const response: any = await axios.get('/invitations');
      // axios interceptor unwraps: response = { success, data: [...invitations] }
      const invitations = response?.data || response || [];
      setInvitationCount(Array.isArray(invitations) ? invitations.length : 0);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleSelectUser = (userId: string, type: 'chat' | 'group') => {
    setSelectedUserId(userId);
    setSelectedType(type);
    setShowChatListOnMobile(false);
  };

  const handleInvitationAccept = () => {
    loadChats();
    loadInvitationCount();
    setActiveTab('messages');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Navigation Bar */}
      <NavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        chatFilter={chatFilter}
        onChatFilterChange={setChatFilter}
        invitationCount={invitationCount}
      />

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <>
          <div className={`${showChatListOnMobile ? 'block' : 'hidden'} md:block`}>
            <ChatList
              selectedUserId={selectedUserId}
              onSelectUser={handleSelectUser}
              filter={chatFilter}
              chats={chats}
              onRefresh={() => loadChats(true)}
              onCreateGroup={() => setShowCreateGroupModal(true)}
            />
          </div>

          <div className={`${showChatListOnMobile ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>
            <ChatArea
              selectedUserId={selectedUserId}
              selectedChat={chats.find(c => c.id === selectedUserId)}
              selectedType={selectedType}
              onBackClick={() => setShowChatListOnMobile(true)}
              onShowMembers={() => setShowMembersOnMobile(true)}
              onChatDeleted={() => {
                loadChats(true);
                setSelectedUserId(null);
              }}
              showBackButton={showChatListOnMobile === false}
            />
          </div>


          <div className="hidden xl:block">
            <Directory
              selectedUserId={selectedUserId}
              selectedChat={chats.find(c => c.id === selectedUserId)}
              isGroup={selectedType === 'group'}
              onChatDeleted={() => {
                loadChats(true);
                setSelectedUserId(null);
              }}
            />
          </div>
        </>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">Invitations</h1>
            <p className="text-sm text-gray-500 mt-1">
              {invitationCount > 0
                ? `${invitationCount} pending invitation${invitationCount > 1 ? 's' : ''}`
                : 'No pending invitations'
              }
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Invitations
              onAccept={handleInvitationAccept}
              refreshTrigger={invitationsRefreshTrigger}
            />
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Profile</h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {authService.getCurrentUser()?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {authService.getCurrentUser()?.username || 'User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {authService.getCurrentUser()?.email || 'email@example.com'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Account</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg text-sm"
                  >
                    Edit Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg text-sm">
                    Privacy Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg text-sm">
                    Notifications
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">About</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Version: 1.0.0</p>
                  <p>Built with Next.js & Socket.io</p>
                  <p>Backend: Node.js + PostgreSQL</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Group Members Overlay */}
      {showMembersOnMobile && selectedType === 'group' && (
        <div className="fixed inset-0 md:hidden bg-black bg-opacity-50 z-50 flex flex-col">
          <div className="bg-white flex-1 overflow-y-auto rounded-t-2xl mt-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Group Members</h2>
              <button
                onClick={() => setShowMembersOnMobile(false)}
                className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
              >
                ✕
              </button>
            </div>
            <Directory selectedUserId={selectedUserId} isGroup={selectedType === 'group'} />
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileSettings onClose={() => setShowProfileModal(false)} />
      )}
      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={(chatId) => {
          loadChats(true);
          handleSelectUser(chatId, 'group');
        }}
      />
    </div>
  );
}