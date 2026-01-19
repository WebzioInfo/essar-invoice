//LogiticsForm.tsx
import { FileText, Truck, Package } from 'lucide-react';

export default function LogisticsForm({ logistics, setLogistics }: any) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <FileText className="w-5 h-5 text-gray-400" />
        </div>
        <input
          className="border border-gray-300 p-3 pl-10 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="E-Way Bill"
          onChange={e => setLogistics({ ...logistics, ewayBill: e.target.value })}
        />
        <label className="absolute -top-2 left-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/30 px-1 text-xs text-gray-600">
          E-Way Bill
        </label>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Truck className="w-5 h-5 text-gray-400" />
        </div>
        <input
          className="border border-gray-300 p-3 pl-10 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="Vehicle No"
          onChange={e => setLogistics({ ...logistics, vehicleNo: e.target.value })}
        />
        <label className="absolute -top-2 left-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/30 px-1 text-xs text-gray-600">
          Vehicle Number
        </label>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Package className="w-5 h-5 text-gray-400" />
        </div>
        <input
          className="border border-gray-300 p-3 pl-10 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="Dispatched Through"
          onChange={e => setLogistics({ ...logistics, dispatchedThrough: e.target.value })}
        />
        <label className="absolute -top-2 left-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/30 px-1 text-xs text-gray-600">
          Dispatched Through
        </label>
      </div>
    </div>
  );
}

