export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Deal {
  source: string;
  item_name: string;
  price: number;
  currency: string;
  original_price?: number | null;
  discount_percent?: number | null;
  url?: string | null;
  in_stock: boolean;
  metadata?: Record<string, unknown>;
}

export interface BestWayToPay {
  source: string;
  item_name: string;
  original_price: number;
  card_name?: string | null;
  effective_price: number;
  reason: string;
}

export interface PriceDrop {
  status: "cheaper" | "increased" | "same" | "no_history";
  difference?: number | null;
  previous_price?: number | null;
  message: string;
}

export interface SearchResponse {
  query: string;
  deals: Deal[];
  cheapest: Deal | null;
  best_way_to_pay: BestWayToPay | null;
  price_drop: PriceDrop | null;
  failed_sources: string[];
}

export interface SavedComparison {
  id: string;
  query: string;
  created_at: string;
  deals: Deal[];
  cheapest_deal: Deal;
  best_way_to_pay: BestWayToPay;
}

export interface Card {
  id: string;
  name: string;
  issuer: string;
  reward_rate: number;
}

export interface ApiErrorShape {
  detail: string | { field: string; message: string }[];
}
