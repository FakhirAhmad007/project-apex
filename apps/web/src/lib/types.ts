export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  sku: string;
  emoji: string;
  description: string;
  is_active: boolean;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  is_active: boolean;
}

export interface InventoryItem {
  id: number;
  product_id: number;
  branch_id: number;
  quantity: number;
  safety_threshold: number;
  updated_at: string;
}

export interface OrderItemLine {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: number;
  branch_id: number;
  status: string;
  total: number;
  delivery_address: string;
  created_at: string;
  items: OrderItemLine[];
}

export interface Review {
  id: number;
  product_id: number;
  rating: number;
  text: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  created_at: string;
}

export interface WasteEntry {
  id: number;
  product_id: number;
  branch_id: number;
  quantity: number;
  reason: string;
  date: string;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
  branch_id: number | null;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface ForecastRow {
  branchId: number;
  branchName: string;
  productId: number;
  productName: string;
  category: string;
  dailyAverage: number;
  predictedQuantity: number;
  dailyForecast: { date: string; quantity: number }[];
  model?: string;
}

export interface AlertRow {
  productId: number;
  productName: string;
  branchId: number;
  branchName: string;
  currentQuantity: number;
  safetyThreshold: number;
  severity: "reorder_now" | "reorder_soon";
}
