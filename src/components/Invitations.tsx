'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';

interface Invitation {
  id: string;
  chat_id: string;
  chat_type: string;
  chat_name?: string;
  inviter_username: string;
  status: string;
  created_at: string;
}

interface InvitationsProps {
  onAccept: () => void;
  refreshTrigger?: number;
}

export default function Invitations({ onAccept, refreshTrigger }: InvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [refreshTrigger]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/invitations');
      setInvitations(response.data || []);
    } catch (error) {
      console.error('Load invitations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (invitationId: string, accept: boolean) => {
    try {
      await axios.post('/invitations/respond', {
        invitation_id: invitationId,
        accept,
      });
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      if (accept) {
        toast.success('Invitation accepted');
        onAccept(); // Refresh chats
      } else {
        toast.success('Invitation declined');
      }
    } catch (error) {
      const errorMessage = error.message || (error.response?.data?.message) || 'Failed to respond to invitation';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>;
  }

  if (invitations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Mail size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Pending Invitations ({invitations.length})
      </h3>
      
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {inv.inviter_username} invited you to a{' '}
                {inv.chat_type === 'group' ? 'group' : 'direct chat'}
              </p>
              {inv.chat_name && (
                <p className="text-xs text-gray-600 mt-1">
                  Group: {inv.chat_name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {new Date(inv.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleRespond(inv.id, true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Check size={16} />
              Accept
            </button>
            <button
              onClick={() => handleRespond(inv.id, false)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              <X size={16} />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}