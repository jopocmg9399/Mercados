export interface PlatformSettings {
  commissionRate: number; // percentage (e.g., 5)
  platformLogo: string;
  assistantTone: 'formal' | 'colloquial';
  allowedProvinces: string[];
  maintenanceMode: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string; // unique identifier for URL
  description: string;
  logo?: string;
  banner?: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  location: {
    province: string;
    municipality: string;
    locality: string;
  };
  commissionRate?: number; // override default if present
  active: boolean;
  featured: boolean;
  createdAt: number;
  settings: StoreSettings;
}

export type Currency = 'CUP' | 'MLC' | 'USD' | 'EUR' | 'ZELLE';

export interface WholesaleTier {
  id: string;
  minPackages: number; // minimum number of packages (e.g., 1, 10, 30)
  pricePerUnit: number; // unit price for this volume level
}

export interface PackagingOption {
  id: string;
  name: string; // e.g., "Caja"
  quantity: number; // units per package (e.g., 24) or units per parent package
  active: boolean;
  parentPackId?: string; // Optional: ID of another packaging this one is based on
  targetProfitMargin?: number; // percentage of the gap to keep as profit (e.g., 70)
  wholesaleTiers: WholesaleTier[];
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  description: string;
  createdAt: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number; // base market/retail price per unit
  cost: number;  // unit cost
  currency: Currency;
  category: string;
  stock: number; // total units in stock
  image?: string;
  active: boolean;
  expiryDate?: string; // YYYY-MM-DD
  createdAt: number;
  wholesaleTiers?: WholesaleTier[];
  packagingOptions?: PackagingOption[];
}

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  imageUrl?: string;
  categories?: string[]; // IDs of categories they supply
  notes?: string;
  active: boolean;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  storeId: string;
  name: string;
  price: number; // price per package unit
  currency: Currency;
  quantity: number; // quantity of packages
  packagingName?: string; // e.g., "Paquete x6"
  packagingQuantity?: number; // units per package (e.g. 6)
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface InventoryEntry {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  quantity: number; // quantity in format
  formatName: string; // e.g. "Caja"
  multiplier: number; // units per format
  totalUnits: number; // quantity * multiplier
  type: 'in' | 'out' | 'adjustment';
  notes?: string;
  createdAt: number;
  cost?: number;
  currency?: Currency;
  adjustmentDirection?: 'up' | 'down';
}

export interface PriceHistory {
  id: string;
  storeId: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  oldCost: number;
  newCost: number;
  currency: Currency;
  reason?: string;
  createdAt: any; // serverTimestamp
}

export interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  totalCUP: number;
  totalMLC: number;
  status: OrderStatus;
  createdAt: any;
  paymentMethod: string;
  notes?: string;
  commissionPaid?: boolean;
  commissionAmount?: number;
  deliveryMethod?: string;
  deliveryCost?: any;
  deliveryZoneName?: string | null;
}

export interface StoreSettings {
  name: string;
  description: string;
  logo?: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  email?: string;
  cupPaymentInstructions: string;
  mlcPaymentInstructions: string;
  zelleInstructions?: string;
  mainCurrency: Currency;
  enabledCurrencies: Currency[];
  exchangeRates: Record<string, number>; // Relative to Main Currency
  activePaymentMethods: ('cash' | 'transfer' | 'zelle')[];
  // Affiliate System settings
  affiliateSystemEnabled?: boolean;
  affiliateMode?: 'recommendation' | 'direct_sale';
}

export interface DailyClose {
  id: string;
  storeId: string;
  closedAt: any;
  closedBy: string;
  totalSalesCUP: number;
  totalSalesMLC: number;
  ordersCount: number;
  notes: string;
  pendingOrdersCount?: number;
  completedOrdersCount?: number;
  cancelledOrdersCount?: number;
  shippedOrdersCount?: number;
  confirmedOrdersCount?: number;
  orderIdsClosed?: string[];
}

export interface CommissionPayment {
  id: string;
  storeId: string;
  amountCUP: number;
  amountMLC: number;
  recordedAt: any;
  recordedBy: string;
  notes: string;
}

