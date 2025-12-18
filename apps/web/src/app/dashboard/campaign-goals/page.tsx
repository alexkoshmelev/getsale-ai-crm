'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface CampaignGoal {
  id: string;
  campaignId: string;
  campaign: {
    name: string;
  };
  goalType: string;
  targetValue: number;
  currentValue: number;
  progress: number;
}

export default function CampaignGoalsPage() {
  const { data: goals, isLoading } = useQuery<CampaignGoal[]>({
    queryKey: ['campaign-goals'],
    queryFn: async () => {
      const res = await fetch('/api/campaign-goals/with-progress');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Campaign Goals</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals?.map((goal) => (
          <div key={goal.id} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">{goal.campaign.name}</h2>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{goal.goalType.replace('_', ' ')}</span>
                <span className="font-semibold">
                  {goal.currentValue} / {goal.targetValue}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(goal.progress, 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-500 mt-1">{goal.progress.toFixed(1)}% complete</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

