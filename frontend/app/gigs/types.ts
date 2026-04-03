export interface GigDetails {
  passengers?: number;
  passengerName?: string;
  passengerContact?: string;
  packageDescription?: string;
  weight?: string;
  fragile?: boolean;
  vehicle_type?: string;
  receiverName?: string;
  receiverContact?: string;
}

export interface Gig {
  id: number;
  type: 'ride' | 'delivery';
  vehicle_type?: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance?: number;
  details: GigDetails | null;
  price: number;
  payout_price?: number;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  user_id: number;
  user_username: string;
  driver_id: number | null;
  driver_username: string | null;
  created_at: string;
  is_paid?: number;
}