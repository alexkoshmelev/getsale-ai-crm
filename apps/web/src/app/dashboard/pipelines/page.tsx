'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: PipelineStage[];
}

interface PipelineStage {
  id: string;
  name: string;
  orderIndex: number;
  color: string | null;
  _count?: {
    deals: number;
  };
}

interface Deal {
  id: string;
  name: string;
  value: number | null;
  currency: string;
  probability: number;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
  stageId: string;
  createdAt: string;
}

export default function PipelinesPage() {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: pipelinesData, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await api.get('/pipelines');
      return response.data;
    },
  });

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', selectedPipeline],
    queryFn: async () => {
      const response = await api.get(
        `/deals${selectedPipeline ? `?pipelineId=${selectedPipeline}` : ''}`,
      );
      return response.data;
    },
    enabled: !!selectedPipeline,
  });

  const pipelines = pipelinesData || [];
  const deals = dealsData || [];

  // Auto-select first pipeline
  if (pipelines.length > 0 && !selectedPipeline) {
    setSelectedPipeline(pipelines[0].id);
  }

  const selectedPipelineData = pipelines.find((p: Pipeline) => p.id === selectedPipeline);

  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      await api.patch(`/deals/${dealId}/stage`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId && dealId !== stageId) {
      updateDealStageMutation.mutate({ dealId, stageId });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (pipelinesLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center py-12">Loading pipelines...</div>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-500">No pipelines yet. Create your first pipeline!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Pipelines</h1>
        </div>

        {/* Pipeline Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Pipeline
          </label>
          <select
            value={selectedPipeline || ''}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
          >
            {pipelines.map((pipeline: Pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name} {pipeline.isDefault && '(Default)'}
              </option>
            ))}
          </select>
        </div>

        {/* Kanban Board */}
        {selectedPipelineData && (
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-4">
              {selectedPipelineData.stages
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((stage: PipelineStage) => {
                  const stageDeals = deals.filter(
                    (deal: Deal) => deal.stageId === stage.id,
                  );
                  return (
                    <div
                      key={stage.id}
                      className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4"
                      onDrop={(e) => handleDrop(e, stage.id)}
                      onDragOver={handleDragOver}
                    >
                      <div
                        className="font-semibold text-gray-900 mb-4 pb-2 border-b"
                        style={{ borderColor: stage.color || '#gray' }}
                      >
                        <div className="flex items-center justify-between">
                          <span>{stage.name}</span>
                          <span className="text-sm text-gray-500">
                            {stageDeals.length}
                            {stage._count && ` / ${stage._count.deals}`}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {dealsLoading ? (
                          <div className="text-center py-4 text-gray-500">Loading...</div>
                        ) : stageDeals.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No deals
                          </div>
                        ) : (
                          stageDeals.map((deal: Deal) => (
                            <div
                              key={deal.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, deal.id)}
                              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md cursor-move transition"
                            >
                              <div className="font-medium text-gray-900">{deal.name}</div>
                              {deal.value && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: deal.currency,
                                  }).format(deal.value)}
                                </div>
                              )}
                              {deal.contact && (
                                <div className="text-xs text-gray-500 mt-2">
                                  {deal.contact.firstName || deal.contact.lastName
                                    ? `${deal.contact.firstName || ''} ${deal.contact.lastName || ''}`.trim()
                                    : deal.contact.email}
                                </div>
                              )}
                              {deal.company && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {deal.company.name}
                                </div>
                              )}
                              {deal.probability > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-500 mb-1">
                                    {deal.probability}% probability
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-primary-600 h-1.5 rounded-full"
                                      style={{ width: `${deal.probability}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

