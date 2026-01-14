/**
 * Bank Selector Component
 * 
 * Component for selecting Armenian banks in ArCa payment gateway
 */

import { ArcaBankId } from '@/lib/types/payments';

interface Bank {
  id: ArcaBankId;
  name: string;
}

const BANKS: Bank[] = [
  { id: '1', name: 'ACBA Bank' },
  { id: '2', name: 'Ardshinbank' },
  { id: '3', name: 'Evoca Bank' },
  { id: '5', name: 'Armswissbank' },
  { id: '6', name: 'Byblos Bank' },
  { id: '7', name: 'Araratbank' },
  { id: '8', name: 'Armeconombank' },
  { id: '9', name: 'IDBank' },
  { id: '11', name: 'Convers Bank' },
];

interface BankSelectorProps {
  value?: string;
  onChange: (bankId: string) => void;
  required?: boolean;
}

export function BankSelector({ value, onChange, required = false }: BankSelectorProps) {
  return (
    <div>
      <label htmlFor="bank-id" className="block text-sm font-medium text-gray-700 mb-1">
        Bank <span className="text-red-500">{required ? '*' : ''}</span>
      </label>
      <select
        id="bank-id"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      >
        <option value="">Select Bank</option>
        {BANKS.map((bank) => (
          <option key={bank.id} value={bank.id}>
            {bank.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">
        Select the bank for ArCa payment gateway
      </p>
    </div>
  );
}


