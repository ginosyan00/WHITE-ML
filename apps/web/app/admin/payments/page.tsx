'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card } from '@shop/ui';
import { apiClient } from '../../../lib/api-client';
import { AdminMenuDrawer } from '../../../components/AdminMenuDrawer';
import { getAdminMenuTABS } from '../admin-menu.config';
import { useTranslation } from '../../../lib/i18n-client';
import { PaymentGatewayType, PaymentGatewayConfig } from '../../../lib/types/payments';
import { PaymentGatewayForm } from '../../../components/admin/payments/PaymentGatewayForm';

interface PaymentGateway {
  id: string;
  type: PaymentGatewayType;
  bankId?: string | null;
  name: string;
  enabled: boolean;
  testMode: boolean;
  position: number;
  healthStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/admin');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchGateways();
    }
  }, [isLoggedIn, isAdmin]);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data: PaymentGateway[] }>('/api/v1/admin/payments');
      console.log('💳 [ADMIN PAYMENTS] Gateways loaded:', response);
      setGateways(response.data);
    } catch (error: any) {
      console.error('❌ [ADMIN PAYMENTS] Error loading gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (gatewayId: string, enabled: boolean) => {
    try {
      await apiClient.put(`/api/v1/admin/payments/${gatewayId}`, {
        enabled: !enabled,
      });
      fetchGateways();
    } catch (error: any) {
      console.error('❌ [ADMIN PAYMENTS] Error toggling gateway:', error);
      alert('Failed to update gateway status');
    }
  };

  const handleDelete = async (gatewayId: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/admin/payments/${gatewayId}`);
      fetchGateways();
    } catch (error: any) {
      console.error('❌ [ADMIN PAYMENTS] Error deleting gateway:', error);
      alert(error.response?.data?.detail || 'Failed to delete gateway');
    }
  };

  const handleEdit = (gateway: PaymentGateway) => {
    setEditingGateway(gateway);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGateway(null);
  };

  const handleFormSubmit = async (gatewayData: Omit<PaymentGateway, 'id' | 'createdAt' | 'updatedAt' | 'healthStatus'>) => {
    try {
      if (editingGateway) {
        // Update existing gateway
        await apiClient.put(`/api/v1/admin/payments/${editingGateway.id}`, gatewayData);
      } else {
        // Create new gateway
        await apiClient.post('/api/v1/admin/payments', gatewayData);
      }
      await fetchGateways();
      handleCloseForm();
    } catch (error: any) {
      console.error('❌ [ADMIN PAYMENTS] Error saving gateway:', error);
      alert(error.response?.data?.detail || error.message || 'Failed to save gateway');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!isLoggedIn || !isAdmin) {
    return null; // Will redirect
  }

  const adminTabs = getAdminMenuTABS(t);
  const currentPath = pathname;

  const getGatewayTypeLabel = (type: PaymentGatewayType): string => {
    const labels: Record<PaymentGatewayType, string> = {
      idram: 'Idram',
      ameriabank: 'Ameriabank',
      inecobank: 'Inecobank',
      arca: 'ArCa',
    };
    return labels[type] || type;
  };

  const getHealthStatusColor = (status?: string | null): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.payments.title')}</h1>
              <p className="text-gray-600 mt-2">{t('admin.payments.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              {t('admin.payments.addGateway')}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:hidden mb-6">
            <AdminMenuDrawer tabs={adminTabs} currentPath={currentPath} />
          </div>
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <nav className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              {adminTabs.map((tab) => {
                const isActive = currentPath === tab.path || 
                  (tab.path === '/admin' && currentPath === '/admin') ||
                  (tab.path !== '/admin' && currentPath.startsWith(tab.path));
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      router.push(tab.path);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      tab.isSubCategory ? 'pl-12' : ''
                    } ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {tab.icon}
                    </span>
                    <span className="text-left">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-600">Loading payment gateways...</p>
              </div>
            ) : gateways.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600 mb-4">{t('admin.payments.noGateways')}</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                  {t('admin.payments.addFirstGateway')}
                </button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {gateways.map((gateway) => (
                  <Card key={gateway.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{gateway.name}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            gateway.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {gateway.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            gateway.testMode
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {gateway.testMode ? 'Test Mode' : 'Production'}
                          </span>
                          {gateway.healthStatus && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthStatusColor(gateway.healthStatus)}`}>
                              {gateway.healthStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Type: <span className="font-medium">{getGatewayTypeLabel(gateway.type)}</span>
                          {gateway.bankId && (
                            <> • Bank ID: <span className="font-medium">{gateway.bankId}</span></>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(gateway.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEnabled(gateway.id, gateway.enabled)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            gateway.enabled
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {gateway.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleEdit(gateway)}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(gateway.id)}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Gateway Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <PaymentGatewayForm
                gateway={editingGateway || undefined}
                onSave={handleFormSubmit}
                onCancel={handleCloseForm}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

