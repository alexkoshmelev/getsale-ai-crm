'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface Subscription {
  plan: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await api.get('/billing/subscription');
      return response.data;
    },
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const response = await api.get('/billing/usage');
      return response.data;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, billingCycle }: { plan: string; billingCycle: string }) => {
      const response = await api.post('/billing/checkout', { plan, billingCycle });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.post('/billing/cancel');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const handleUpgrade = (plan: string) => {
    checkoutMutation.mutate({ plan, billingCycle });
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
      cancelMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      features: ['Up to 50 contacts', 'Basic CRM', 'Email support'],
    },
    {
      name: 'Pro',
      price: { monthly: 29, yearly: 290 },
      features: ['Unlimited contacts', 'AI drafts', 'Telegram integration', 'Priority support'],
    },
    {
      name: 'Team',
      price: { monthly: 99, yearly: 990 },
      features: ['Everything in Pro', 'Team collaboration', 'Advanced analytics', 'Custom integrations'],
    },
    {
      name: 'Enterprise',
      price: { monthly: 299, yearly: 2990 },
      features: ['Everything in Team', 'Dedicated support', 'Custom AI agents', 'SLA guarantee'],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Billing & Subscription</h1>

        {/* Current Subscription */}
        {subscription && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="text-lg font-medium capitalize">{subscription.plan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-medium capitalize">{subscription.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Billing Cycle</p>
                <p className="text-lg font-medium capitalize">{subscription.billingCycle}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Billing Date</p>
                <p className="text-lg font-medium">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Cancel Subscription
              </button>
            )}
            {subscription.cancelAtPeriodEnd && (
              <p className="mt-4 text-sm text-yellow-600">
                Your subscription will be canceled at the end of the billing period.
              </p>
            )}
          </div>
        )}

        {/* Usage Statistics */}
        {usage && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Usage This Month</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(usage.summary || {}).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold">{value as number}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="mb-6">
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-l-md ${
                  billingCycle === 'monthly'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-r-md ${
                  billingCycle === 'yearly'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Yearly (Save 17%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const price = plan.price[billingCycle];
              const isCurrentPlan = subscription?.plan === plan.name.toLowerCase();
              const isUpgrade =
                subscription?.plan !== 'enterprise' &&
                ['free', 'pro', 'team', 'enterprise'].indexOf(plan.name.toLowerCase()) >
                  ['free', 'pro', 'team', 'enterprise'].indexOf(subscription?.plan || 'free');

              return (
                <div
                  key={plan.name}
                  className={`bg-white rounded-lg shadow-lg p-6 ${
                    isCurrentPlan ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-gray-500">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.name.toLowerCase())}
                      disabled={checkoutMutation.isPending}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      {checkoutMutation.isPending ? 'Processing...' : isUpgrade ? 'Upgrade' : 'Select'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

