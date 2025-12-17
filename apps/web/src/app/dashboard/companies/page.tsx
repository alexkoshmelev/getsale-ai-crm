'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface Company {
  id: string;
  name: string;
  industry: string | null;
  description: string | null;
  size: string | null;
  stage: string | null;
  website: string | null;
  createdAt: string;
  _count?: {
    contacts: number;
    deals: number;
  };
}

export default function CompaniesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/companies');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const companies = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this company?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <button
            onClick={() => {
              setEditingCompany(null);
              setIsModalOpen(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            + Add Company
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No companies yet. Create your first company!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company: Company) => (
              <div
                key={company.id}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                    {company.industry && (
                      <p className="text-sm text-gray-500 mt-1">{company.industry}</p>
                    )}
                    {company.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {company.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                      {company.size && <span>Size: {company.size}</span>}
                      {company.stage && <span>Stage: {company.stage}</span>}
                    </div>
                    {company._count && (
                      <div className="mt-4 flex items-center space-x-4 text-xs text-gray-400">
                        <span>{company._count.contacts} contacts</span>
                        <span>{company._count.deals} deals</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditingCompany(company);
                      setIsModalOpen(true);
                    }}
                    className="text-primary-600 hover:text-primary-900 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(company.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <CompanyModal
            company={editingCompany}
            onClose={() => {
              setIsModalOpen(false);
              setEditingCompany(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['companies'] });
              setIsModalOpen(false);
              setEditingCompany(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CompanyModal({
  company,
  onClose,
  onSuccess,
}: {
  company: Company | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    industry: company?.industry || '',
    description: company?.description || '',
    size: company?.size || '',
    stage: company?.stage || '',
    website: company?.website || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (company) {
        return api.patch(`/companies/${company.id}`, data);
      } else {
        return api.post('/companies', data);
      }
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {company ? 'Edit Company' : 'Create Company'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Size</label>
            <select
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select size</option>
              <option value="startup">Startup</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Stage</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select stage</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
              <option value="partner">Partner</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : company ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

