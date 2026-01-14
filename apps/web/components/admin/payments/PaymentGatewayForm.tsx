/**
 * Payment Gateway Form Component
 * 
 * Form for creating/editing payment gateways
 */

'use client';

import { useState, useEffect } from 'react';
import { PaymentGatewayType, PaymentGatewayConfig, IdramConfig, AmeriabankConfig, InecobankConfig, ArcaConfig } from '@/lib/types/payments';
import { GatewaySpecificForms } from './GatewaySpecificForms';
import { Button } from '@shop/ui';

interface PaymentGateway {
  id?: string;
  type: PaymentGatewayType;
  bankId?: string | null;
  name: string;
  enabled: boolean;
  testMode: boolean;
  config: PaymentGatewayConfig;
  position: number;
}

interface PaymentGatewayFormProps {
  gateway?: PaymentGateway | null;
  onSave: (gateway: Omit<PaymentGateway, 'id'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const DEFAULT_CONFIGS: Record<PaymentGatewayType, PaymentGatewayConfig> = {
  idram: {
    idramID: '',
    idramKey: '',
    idramTestID: '',
    idramTestKey: '',
    rocketLine: false,
    defaultLanguage: 'en',
  } as IdramConfig,
  ameriabank: {
    clientID: '',
    accounts: {},
  } as AmeriabankConfig,
  inecobank: {
    accounts: {},
  } as InecobankConfig,
  arca: {
    bankId: '1',
    accounts: {},
  } as ArcaConfig,
};

export function PaymentGatewayForm({ gateway, onSave, onCancel, loading = false }: PaymentGatewayFormProps) {
  const [formData, setFormData] = useState<Omit<PaymentGateway, 'id'>>({
    type: gateway?.type || 'idram',
    bankId: gateway?.bankId || null,
    name: gateway?.name || '',
    enabled: gateway?.enabled ?? false,
    testMode: gateway?.testMode ?? true,
    config: gateway?.config || DEFAULT_CONFIGS[gateway?.type || 'idram'],
    position: gateway?.position ?? 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (gateway) {
      setFormData({
        type: gateway.type,
        bankId: gateway.bankId,
        name: gateway.name,
        enabled: gateway.enabled,
        testMode: gateway.testMode,
        config: gateway.config,
        position: gateway.position,
      });
    } else {
      // Reset to defaults for new gateway
      setFormData({
        type: 'idram',
        bankId: null,
        name: '',
        enabled: false,
        testMode: true,
        config: DEFAULT_CONFIGS.idram,
        position: 0,
      });
    }
  }, [gateway]);

  const handleTypeChange = (type: PaymentGatewayType) => {
    setFormData({
      ...formData,
      type,
      bankId: type === 'arca' ? '1' : null,
      config: DEFAULT_CONFIGS[type],
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.type === 'arca' && !formData.bankId) {
      newErrors.bankId = 'Bank selection is required for ArCa';
    }

    // Validate config based on type
    if (formData.type === 'idram') {
      const idramConfig = formData.config as IdramConfig;
      if (!idramConfig.idramID && !idramConfig.idramTestID) {
        newErrors.config = 'Either production or test credentials are required';
      }
    } else if (formData.type === 'ameriabank') {
      const ameriabankConfig = formData.config as AmeriabankConfig;
      if (!ameriabankConfig.clientID) {
        newErrors.config = 'Client ID is required';
      }
    } else if (formData.type === 'arca') {
      const arcaConfig = formData.config as ArcaConfig;
      if (!arcaConfig.bankId) {
        newErrors.config = 'Bank ID is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSave(formData);
    } catch (error: any) {
      console.error('Error saving gateway:', error);
      setErrors({ submit: error.message || 'Failed to save gateway' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Gateway Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gateway Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.type}
          onChange={(e) => handleTypeChange(e.target.value as PaymentGatewayType)}
          disabled={!!gateway} // Can't change type when editing
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
        >
          <option value="idram">Idram</option>
          <option value="ameriabank">Ameriabank</option>
          <option value="inecobank">Inecobank</option>
          <option value="arca">ArCa</option>
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gateway Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="e.g., Idram Production"
          required
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Bank ID (for ArCa) */}
      {formData.type === 'arca' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank ID
          </label>
          <input
            type="text"
            value={formData.bankId || ''}
            onChange={(e) => setFormData({ ...formData, bankId: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="1-11 (excluding 4, 10, 12)"
          />
          {errors.bankId && <p className="mt-1 text-sm text-red-600">{errors.bankId}</p>}
        </div>
      )}

      {/* Gateway-Specific Configuration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Configuration <span className="text-red-500">*</span>
        </label>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <GatewaySpecificForms
            gatewayType={formData.type}
            config={formData.config}
            onChange={(config) => setFormData({ ...formData, config })}
          />
        </div>
        {errors.config && <p className="mt-1 text-sm text-red-600">{errors.config}</p>}
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Enabled</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.testMode}
            onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Test Mode</span>
        </label>
      </div>

      {/* Position */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Position
        </label>
        <input
          type="number"
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          min="0"
        />
        <p className="mt-1 text-xs text-gray-500">
          Lower numbers appear first in the list
        </p>
      </div>

      {/* Error Message */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : (gateway ? 'Update' : 'Create')}
        </Button>
      </div>
    </form>
  );
}

