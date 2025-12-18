'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface BidiDashboard {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  bidiType: string;
  ownership: string;
  targets: {
    replies?: number;
    meetings?: number;
    revenue?: number;
  };
  workload: {
    contacts: number;
    chats: number;
  };
  performance: {
    metrics: {
      messagesSent: number;
      replies: number;
      meetings: number;
      deals: number;
      revenue: number;
    };
    targets: {
      targetReplies?: number;
      targetMeetings?: number;
      targetRevenue?: number;
    };
  };
}

export default function BidiDashboardPage() {
  const { data: dashboard, isLoading } = useQuery<BidiDashboard[]>({
    queryKey: ['bidi-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/bidi/dashboard');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">BiDi Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboard?.map((bidi) => (
          <div key={bidi.id} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{bidi.user.name || bidi.user.email}</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Workload</h3>
                <div className="flex justify-between">
                  <span>Contacts:</span>
                  <span className="font-semibold">{bidi.workload.contacts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chats:</span>
                  <span className="font-semibold">{bidi.workload.chats}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Performance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Messages Sent:</span>
                    <span>{bidi.performance.metrics.messagesSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Replies:</span>
                    <span>
                      {bidi.performance.metrics.replies}
                      {bidi.targets.replies && ` / ${bidi.targets.replies}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deals:</span>
                    <span>{bidi.performance.metrics.deals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span>${bidi.performance.metrics.revenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

