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
      {/* Production Credentials */}
      <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">PRODUCTION</span>
          Production Credentials
        </h3>
        <p className="text-xs text-gray-600 mb-4">Օգտագործվում է, երբ Test Mode-ը անջատված է</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idram Merchant ID (Production) *
            </label>
            <input
              type="text"
              value={config.idramID || ''}
              onChange={(e) => onChange({ ...config, idramID: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="100000114"
            />
            <p className="mt-1 text-xs text-gray-500">Idram-ից ստացած Production Merchant ID-ն</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idram Secret Key (Production) *
            </label>
            <input
              type="password"
              value={config.idramKey || ''}
              onChange={(e) => onChange({ ...config, idramKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Your production secret key"
            />
            <p className="mt-1 text-xs text-gray-500">Idram-ից ստացած Production Secret Key-ն</p>
          </div>
        </div>
      </div>

      {/* Test Credentials */}
      <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">TEST</span>
          Test Credentials
        </h3>
        <p className="text-xs text-gray-600 mb-4">Օգտագործվում է, երբ Test Mode-ը միացված է</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idram Test Merchant ID
            </label>
            <input
              type="text"
              value={config.idramTestID || ''}
              onChange={(e) => onChange({ ...config, idramTestID: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Test merchant ID"
            />
            <p className="mt-1 text-xs text-gray-500">Idram-ից ստացած Test Merchant ID-ն (test ID)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idram Test Secret Key
            </label>
            <input
              type="password"
              value={config.idramTestKey || ''}
              onChange={(e) => onChange({ ...config, idramTestKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Test secret key"
            />
            <p className="mt-1 text-xs text-gray-500">Idram-ից ստացած Test Secret Key-ն (test secret key)</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.rocketLine || false}
              onChange={(e) => onChange({ ...config, rocketLine: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Rocket Line</span>
          </label>
          <p className="mt-1 text-xs text-gray-500 ml-6">Idram Rocket Line ֆունկցիայի միացում</p>
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
          <p className="mt-1 text-xs text-gray-500">Idram payment page-ի լեզուն</p>
        </div>
      </div>
    </div>
  );
}

// Ameriabank Form Fields
function AmeriabankFormFields({ config, onChange }: { config: AmeriabankConfig; onChange: (config: AmeriabankConfig) => void }) {
  const updateAMDAccount = (field: 'username' | 'password', value: string) => {
    const accounts = { ...config.accounts };
    if (!accounts.AMD) {
      accounts.AMD = { username: '', password: '' };
    }
    accounts.AMD = { ...accounts.AMD, [field]: value };
    onChange({ ...config, accounts });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID * <span className="text-xs font-normal text-gray-500">(Merchant ID)</span>
          </label>
          <input
            type="text"
            value={config.clientID || ''}
            onChange={(e) => onChange({ ...config, clientID: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Ameriabank-ից ստացած Client ID"
            required
          />
          <p className="mt-1 text-xs text-gray-500">Ameriabank-ից ստացած Client ID-ն (նույնն է test-ի և production-ի համար)</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AMD Account Credentials</h3>
        <p className="text-xs text-gray-600 mb-4">
          Test Mode ON → օգտագործվում են test credentials<br/>
          Test Mode OFF → օգտագործվում են production credentials
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username * <span className="text-xs font-normal text-gray-500">(Merchant Username)</span>
            </label>
            <input
              type="text"
              value={config.accounts?.AMD?.username || ''}
              onChange={(e) => updateAMDAccount('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="AMD account username"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Test-ի համար → test username, Production-ի համար → production username</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password * <span className="text-xs font-normal text-gray-500">(Secret Key)</span>
            </label>
            <input
              type="password"
              value={config.accounts?.AMD?.password || ''}
              onChange={(e) => updateAMDAccount('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="AMD account secret key"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Test-ի համար → test secret key, Production-ի համար → production secret key</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Test Order ID Range (Optional)</h4>
        <p className="text-xs text-gray-600 mb-4">Test Mode-ում սահմանափակում է, թե որ order ID-ներն են թույլատրված</p>
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
            <p className="mt-1 text-xs text-gray-500">Նվազագույն order ID</p>
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
            <p className="mt-1 text-xs text-gray-500">Առավելագույն order ID</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inecobank Form Fields
function InecobankFormFields({ config, onChange }: { config: InecobankConfig; onChange: (config: InecobankConfig) => void }) {
  const updateAMDAccount = (field: 'username' | 'password', value: string) => {
    const accounts = { ...config.accounts };
    if (!accounts.AMD) {
      accounts.AMD = { username: '', password: '' };
    }
    accounts.AMD = { ...accounts.AMD, [field]: value };
    onChange({ ...config, accounts });
  };

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AMD Account Credentials</h3>
        <p className="text-xs text-gray-600 mb-4">
          Test Mode ON → օգտագործվում են test credentials<br/>
          Test Mode OFF → օգտագործվում են production credentials
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username * <span className="text-xs font-normal text-gray-500">(Merchant ID / Test ID)</span>
            </label>
            <input
              type="text"
              value={config.accounts?.AMD?.username || ''}
              onChange={(e) => updateAMDAccount('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Inecobank-ից ստացած Merchant ID"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Test-ի համար → test merchant ID (test ID), Production-ի համար → production merchant ID
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password * <span className="text-xs font-normal text-gray-500">(Secret Key)</span>
            </label>
            <input
              type="password"
              value={config.accounts?.AMD?.password || ''}
              onChange={(e) => updateAMDAccount('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Inecobank-ից ստացած Secret Key"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Test-ի համար → test secret key, Production-ի համար → production secret key
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ArCa Form Fields
function ArcaFormFields({ config, onChange }: { config: ArcaConfig; onChange: (config: ArcaConfig) => void }) {
  const updateAMDAccount = (field: 'username' | 'password', value: string) => {
    const accounts = { ...config.accounts };
    if (!accounts.AMD) {
      accounts.AMD = { username: '', password: '' };
    }
    accounts.AMD = { ...accounts.AMD, [field]: value };
    onChange({ ...config, accounts });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <BankSelector
          value={config.bankId}
          onChange={(bankId) => onChange({ ...config, bankId: bankId as any })}
          required
        />
        <p className="mt-2 text-xs text-gray-500">Ընտրեք բանկը, որի համար կարգավորում եք gateway-ն</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AMD Account Credentials</h3>
        <p className="text-xs text-gray-600 mb-4">
          Test Mode ON → օգտագործվում են test credentials<br/>
          Test Mode OFF → օգտագործվում են production credentials
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username * <span className="text-xs font-normal text-gray-500">(Merchant ID / Test ID)</span>
            </label>
            <input
              type="text"
              value={config.accounts?.AMD?.username || ''}
              onChange={(e) => updateAMDAccount('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="ArCa-ից ստացած Merchant ID"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Test-ի համար → test merchant ID (test ID), Production-ի համար → production merchant ID
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password * <span className="text-xs font-normal text-gray-500">(Secret Key)</span>
            </label>
            <input
              type="password"
              value={config.accounts?.AMD?.password || ''}
              onChange={(e) => updateAMDAccount('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="ArCa-ից ստացած Secret Key"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Test-ի համար → test secret key, Production-ի համար → production secret key
            </p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Port (Optional)
        </label>
        <input
          type="number"
          value={config.testPort || ''}
          onChange={(e) => onChange({ ...config, testPort: parseInt(e.target.value) || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="8443"
        />
        <p className="mt-1 text-xs text-gray-500">
          Test Mode-ում օգտագործվող port (սովորաբար 8443): եթե չեք լրացնում, օգտագործվում է default port
        </p>
      </div>
    </div>
  );
}

