/**
 * Gateway-Specific Form Fields
 * 
 * Dynamic form fields for each payment gateway type
 */

import { PaymentGatewayType, IdramConfig, AmeriabankConfig, InecobankConfig, ArcaConfig } from '@/lib/types/payments';
import { BankSelector } from './BankSelector';

interface GatewaySpecificFormsProps {
  gatewayType: PaymentGatewayType;
  config: any;
  onChange: (config: any) => void;
}

export function GatewaySpecificForms({ gatewayType, config, onChange }: GatewaySpecificFormsProps) {
  const updateConfig = (updates: any) => {
    onChange({ ...config, ...updates });
  };

  switch (gatewayType) {
    case 'idram':
      return <IdramFormFields config={config as IdramConfig} onChange={updateConfig} />;
    case 'ameriabank':
      return <AmeriabankFormFields config={config as AmeriabankConfig} onChange={updateConfig} />;
    case 'inecobank':
      return <InecobankFormFields config={config as InecobankConfig} onChange={updateConfig} />;
    case 'arca':
      return <ArcaFormFields config={config as ArcaConfig} onChange={updateConfig} />;
    default:
      return null;
  }
}

// Idram Form Fields
function IdramFormFields({ config, onChange }: { config: IdramConfig; onChange: (config: IdramConfig) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Production Credentials</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Idram ID (Production) *
        </label>
        <input
          type="text"
          value={config.idramID || ''}
          onChange={(e) => onChange({ ...config, idramID: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="100000114"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Idram Key (Production) *
        </label>
        <input
          type="password"
          value={config.idramKey || ''}
          onChange={(e) => onChange({ ...config, idramKey: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Your production key"
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mt-6">Test Credentials</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Idram Test ID
        </label>
        <input
          type="text"
          value={config.idramTestID || ''}
          onChange={(e) => onChange({ ...config, idramTestID: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Test ID"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Idram Test Key
        </label>
        <input
          type="password"
          value={config.idramTestKey || ''}
          onChange={(e) => onChange({ ...config, idramTestKey: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Test key"
        />
      </div>

      <div className="mt-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.rocketLine || false}
            onChange={(e) => onChange({ ...config, rocketLine: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Rocket Line</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Default Language
        </label>
        <select
          value={config.defaultLanguage || 'en'}
          onChange={(e) => onChange({ ...config, defaultLanguage: e.target.value as 'en' | 'hy' | 'ru' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="en">English</option>
          <option value="hy">Armenian</option>
          <option value="ru">Russian</option>
        </select>
      </div>
    </div>
  );
}

// Ameriabank Form Fields
function AmeriabankFormFields({ config, onChange }: { config: AmeriabankConfig; onChange: (config: AmeriabankConfig) => void }) {
  const updateAccount = (currency: 'AMD' | 'USD' | 'EUR' | 'RUB', field: 'username' | 'password', value: string) => {
    const accounts = { ...config.accounts };
    if (!accounts[currency]) {
      accounts[currency] = { username: '', password: '' };
    }
    accounts[currency] = { ...accounts[currency], [field]: value };
    onChange({ ...config, accounts });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client ID *
        </label>
        <input
          type="text"
          value={config.clientID || ''}
          onChange={(e) => onChange({ ...config, clientID: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Your client ID"
          required
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mt-6">Currency Accounts</h3>
      {(['AMD', 'USD', 'EUR', 'RUB'] as const).map((currency) => (
        <div key={currency} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">{currency} Account</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.accounts?.[currency]?.username || ''}
                onChange={(e) => updateAccount(currency, 'username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={`${currency} username`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.accounts?.[currency]?.password || ''}
                onChange={(e) => updateAccount(currency, 'password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={`${currency} password`}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Test Order ID
          </label>
          <input
            type="number"
            value={config.minTestOrderId || ''}
            onChange={(e) => onChange({ ...config, minTestOrderId: parseInt(e.target.value) || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="1000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Test Order ID
          </label>
          <input
            type="number"
            value={config.maxTestOrderId || ''}
            onChange={(e) => onChange({ ...config, maxTestOrderId: parseInt(e.target.value) || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="9999"
          />
        </div>
      </div>
    </div>
  );
}

// Inecobank Form Fields
function InecobankFormFields({ config, onChange }: { config: InecobankConfig; onChange: (config: InecobankConfig) => void }) {
  const updateAccount = (currency: 'AMD' | 'USD' | 'EUR' | 'RUB', field: 'username' | 'password', value: string) => {
    const accounts = { ...config.accounts };
    if (!accounts[currency]) {
      accounts[currency] = { username: '', password: '' };
    }
    accounts[currency] = { ...accounts[currency], [field]: value };
    onChange({ ...config, accounts });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Currency Accounts</h3>
      {(['AMD', 'USD', 'EUR', 'RUB'] as const).map((currency) => (
        <div key={currency} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">{currency} Account</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.accounts?.[currency]?.username || ''}
                onChange={(e) => updateAccount(currency, 'username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={`${currency} username`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.accounts?.[currency]?.password || ''}
                onChange={(e) => updateAccount(currency, 'password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={`${currency} password`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ArCa Form Fields
function ArcaFormFields({ config, onChange }: { config: ArcaConfig; onChange: (config: ArcaConfig) => void }) {
  const updateAccount = (currency: 'AMD' | 'USD' | 'EUR' | 'RUB', field: 'username' | 'password', value: string) => {
    const accounts = { ...config.accounts };
    if (!accounts[currency]) {
      accounts[currency] = { username: '', password: '' };
    }
    accounts[currency] = { ...accounts[currency], [field]: value };
    onChange({ ...config, accounts });
  };

  return (
    <div className="space-y-4">
      <BankSelector
        value={config.bankId}
        onChange={(bankId) => onChange({ ...config, bankId: bankId as any })}
        required
      />

      <h3 className="text-lg font-semibold text-gray-900 mt-6">Currency Accounts</h3>
      {(['AMD', 'USD', 'EUR', 'RUB'] as const).map((currency) => (
        <div key={currency} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">{currency} Account</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.accounts?.[currency]?.username || ''}
                onChange={(e) => updateAccount(currency, 'username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={`${currency} username`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.accounts?.[currency]?.password || ''}
                onChange={(e) => updateAccount(currency, 'password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={`${currency} password`}
              />
            </div>
          </div>
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Port
        </label>
        <input
          type="number"
          value={config.testPort || ''}
          onChange={(e) => onChange({ ...config, testPort: parseInt(e.target.value) || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="8443"
        />
        <p className="mt-1 text-xs text-gray-500">
          Port for test mode (optional)
        </p>
      </div>
    </div>
  );
}

