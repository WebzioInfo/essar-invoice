export type Product = {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gst: number;
};

export type Address = {
  name: string;
  address1: string;
  address2: string;
  gst?: string;
  phone?: string;
  state: string;
};

export type Logistics = {
  ewayBill?: string;
  vehicleNo?: string;
  dispatchedThrough?: string;
};

export type Invoice = {
  invoiceNo: string;
  date: string;
  gstType: "cgst" | "igst" | "nogst";
  billing: Address;
  shipping: Address;
  logistics?: Logistics;
  products: Product[];
  sameAsBilling?: boolean;
};

export type Client = {
  id: string;
  name: string;
  gst: string;
  phone: string;
  address1: string;
  address2: string;
  state: string;
};
