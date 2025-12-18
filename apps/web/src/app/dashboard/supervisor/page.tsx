'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Chat {
  id: string;
  contact: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  assignments: Array<{
    bidi: {
      user: {
        name?: string;
        email: string;
      };
    };
  }>;
  isUnread: boolean;
  lastMessageAt?: string;
}

export default function SupervisorPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'bidi'>('all');

  const { data: chats, isLoading } = useQuery<Chat[]>({
    queryKey: ['supervisor-chats', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === 'unread') params.set('isUnread', 'true');
      const res = await fetch(`/api/supervisor/chats?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Supervisor Mode</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded ${filter === 'unread' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Unread
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {chats?.map((chat) => (
              <tr key={chat.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {chat.contact.firstName} {chat.contact.lastName}
                  <div className="text-sm text-gray-500">{chat.contact.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {chat.assignments[0]?.bidi?.user?.name || chat.assignments[0]?.bidi?.user?.email || 'Unassigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {chat.isUnread ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Unread
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Read
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={`/dashboard/chats/${chat.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

