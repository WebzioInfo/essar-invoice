import { PRODUCTS } from '@/app/data/product';
import { Product } from '@/app/types/invoice';
import { Plus, Trash2, ChevronDown } from 'lucide-react';


export default function ProductTable({ products, setProducts, gstType }: { 
  products: Product[]; 
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  gstType?: "cgst" | "igst" | "nogst";
}) {
  const showGST = gstType !== "nogst";

  const update = (i: number, key: keyof Product, val: any) => {
    setProducts(prev =>
      prev.map((p, idx) => (idx === i ? { ...p, [key]: val } : p))
    );
  };

  const addRow = () =>
    setProducts(prev => [
      ...prev,
      { description: "", hsn: "", qty: 1, rate: 0, gst: 18 }
    ]);

  const removeRow = (i: number) =>
    setProducts(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div
        className={`grid ${
          showGST ? "grid-cols-8" : "grid-cols-7"
        } gap-3 bg-linear-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100`}
      >
        <span className="font-semibold text-sm text-gray-700">Product</span>
        <span className="font-semibold text-sm text-gray-700">Description</span>
        <span className="font-semibold text-sm text-gray-700">HSN</span>
        <span className="font-semibold text-sm text-gray-700">Qty</span>
        <span className="font-semibold text-sm text-gray-700">Rate</span>
        {showGST && <span className="font-semibold text-sm text-gray-700">GST%</span>}
        <span className="font-semibold text-sm text-gray-700">Amount</span>
        <span className="font-semibold text-sm text-gray-700"></span>
      </div>

      {/* ROWS */}
      {products.map((p, i) => (
        <div
          key={i}
          className={`grid ${
            showGST ? "grid-cols-8" : "grid-cols-7"
          } gap-3 items-center bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all`}
        >
          {/* PRODUCT SELECT */}
          <div className="relative">
            <select
              className="appearance-none border border-gray-300 p-2 pr-8 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer text-sm"
              onChange={e => {
                const prod = PRODUCTS.find(x => x.id === e.target.value);
                if (prod) {
                  update(i, "description", prod.description);
                  update(i, "hsn", prod.hsn);
                  update(i, "rate", prod.rate);
                  update(i, "gst", prod.gst);
                }
              }}
            >
              <option value="">Select</option>
              {PRODUCTS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.description}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <input
            className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            value={p.description}
            onChange={e => update(i, "description", e.target.value)}
            placeholder="Description"
          />

          <input
            className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            value={p.hsn}
            onChange={e => update(i, "hsn", e.target.value)}
            placeholder="HSN"
          />

          <input
            className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            type="number"
            value={p.qty}
            onChange={e => update(i, "qty", +e.target.value)}
            placeholder="Qty"
          />

          <input
            className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            type="number"
            value={p.rate}
            onChange={e => update(i, "rate", +e.target.value)}
            placeholder="Rate"
          />

          {showGST && (
            <input
              className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              type="number"
              value={p.gst}
              onChange={e => update(i, "gst", +e.target.value)}
              placeholder="GST%"
            />
          )}

          <input
            className="border border-gray-200 p-2 rounded-lg bg-linear-to-br from-gray-50 to-gray-100 text-gray-700 font-semibold text-sm"
            value={(p.qty * p.rate).toFixed(2)}
            readOnly
          />

          <button
            className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all group"
            onClick={() => removeRow(i)}
            title="Remove product"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      ))}

      <button 
        onClick={addRow} 
        className="flex items-center gap-2 border-2 border-dashed border-blue-300 px-4 py-3 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all text-blue-600 font-medium text-sm w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Product
      </button>
    </div>
  );
}

