import { CLIENTS } from '@/app/data/clients';
import { ChevronDown } from 'lucide-react';


export default function ClientSelector({ onSelect }: { onSelect: (c: any) => void }) {
  return (
    <div className="space-y-2">
      <label className="font-semibold text-sm text-gray-700 block">
        Select Client
      </label>
      <div className="relative">
        <select
          className="appearance-none border border-gray-300 p-3 pr-10 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer hover:border-gray-400"
          onChange={(e) => {
            const client = CLIENTS.find(c => c.id === e.target.value);
            if (client) onSelect(client);
          }}
        >
          <option value="" className="text-gray-500">
            -- Select Client --
          </option>
          {CLIENTS.map(c => (
            <option key={c.id} value={c.id} className="py-2">
              {c.name} ({c.state})
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}