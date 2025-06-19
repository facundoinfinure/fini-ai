export interface TiendaNubeStore {
  id: number;
  name: string;
  url: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeProduct {
  id: number;
  name: string;
  description: string;
  handle: string;
  attributes: Array<{
    id: number;
    name: string;
    value: string;
  }>;
  published: boolean;
  free_shipping: boolean;
  requires_shipping: boolean;
  canonical_url: string;
  seo_title: string;
  seo_description: string;
  brand: string;
  created_at: string;
  updated_at: string;
  variants: TiendaNubeVariant[];
  images: TiendaNubeImage[];
  categories: TiendaNubeCategory[];
}

export interface TiendaNubeVariant {
  id: number;
  product_id: number;
  sku: string;
  barcode: string;
  price: string;
  promotional_price: string | null;
  stock_management: boolean;
  stock: number;
  weight: string;
  width: string;
  height: string;
  depth: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeImage {
  id: number;
  product_id: number;
  src: string;
  position: number;
  alt: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeCategory {
  id: number;
  name: string;
  description: string;
  handle: string;
  parent: number | null;
  subcategories: TiendaNubeCategory[];
  google_shopping_category: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeOrder {
  id: number;
  number: number;
  token: string;
  status: 'open' | 'closed' | 'cancelled';
  payment_status: 'pending' | 'authorized' | 'paid' | 'voided' | 'refunded' | 'partially_refunded';
  gateway_status: string;
  subtotal: string;
  discount: string;
  total: string;
  total_usd: string;
  checkout_enabled: boolean;
  weight: string;
  currency: string;
  language: string;
  gateway: string;
  shipping: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  next_action: string;
  payment_details: any;
  attributes: any[];
  note: string;
  customer: TiendaNubeCustomer;
  products: TiendaNubeOrderProduct[];
  billing_address: TiendaNubeAddress;
  shipping_address: TiendaNubeAddress;
}

export interface TiendaNubeOrderProduct {
  id: number;
  product_id: number;
  variant_id: number;
  name: string;
  price: string;
  quantity: number;
  free_shipping: boolean;
  weight: string;
  sku: string;
  barcode: string;
}

export interface TiendaNubeCustomer {
  id: number;
  name: string;
  email: string;
  identification: string;
  phone: string;
  note: string;
  default_address: TiendaNubeAddress;
  addresses: TiendaNubeAddress[];
  billing_name: string;
  billing_phone: string;
  billing_address: TiendaNubeAddress;
  extra: any;
  total_spent: string;
  total_spent_currency: string;
  last_order_id: number | null;
  active: boolean;
  first_interaction: string;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

export interface TiendaNubeAddress {
  address: string;
  city: string;
  country: string;
  created_at: string;
  default: boolean;
  floor: string;
  id: number;
  locality: string;
  number: string;
  phone: string;
  province: string;
  updated_at: string;
  zipcode: string;
}

export interface TiendaNubeAuthResponse {
  access_token: string;
  token_type: 'bearer';
  scope: string;
  user_id: number;
}

export interface TiendaNubeWebhookPayload {
  id: number;
  event: string;
  created_at: string;
  store_id: number;
} 