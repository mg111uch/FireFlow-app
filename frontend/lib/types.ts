// Main Post type used across the application
export interface Post {
  id: number;
  title: string;
  content?: string;
  user_id: number;
  username: string;
  community_id: number | null;
  community_name: string | null;
  post_type?: 'general' | 'community';
  image_url?: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  views: number;
  is_saved?: boolean;
  user_vote_type?: 1 | -1 | null;
  repost_count?: number;
  original_post_id?: number;
}

// Community type
export interface Community {
  id: number;
  name: string;
  description: string;
  creator_id: number;
  creator_username?: string; // Optional because not always fetched
  member_count?: number; // Optional because not always fetched
}

// Comment type
export interface Comment {
  id: number;
  content: string;
  user_id: number;
  username: string;
  post_id: number;
  parent_id?: number | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_vote_type: 1 | -1 | null;
  is_saved?: boolean;
  replies?: Comment[];
  is_pinned?: boolean;
  reply_count?: number;
}

// User details type
export interface UserDetails {
  id: number;  
  username: string;
  email: string;
  profile_img_url?:string;
  created_at: string;
  followerCount: number; 
  followingCount: number; 
  isFollowing: boolean; 
}

// Chat Message type
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  read_status: number; // 0 for unread, 1 for read
  sender_username: string;
  receiver_username: string;
  edited?: number;
  reactions?: Reaction[];
}

// Reaction type
export interface Reaction {
  id: number;
  message_id: number;
  user_id: number;
  username: string;
  emoji: string;
}

// Notification type
export interface Notification {
  id: number;
  type: 'new_comment' | 'reply' | 'mention';
  post_id: number;
  comment_id: number;
  content_preview: string;
  is_read: boolean;
  created_at: string;
  sender_username: string;
  post_title: string;
}

// Form types
export interface FormQuestionOption {
  id?: number; // Optional if not yet saved to DB
  option_text: string;
}

export interface FormQuestion {
  id?: number; // Optional if not yet saved to DB
  question_text: string;
  question_type: 'text' | 'textarea' | 'radio';
  order_index?: number; // Backend handles this
  options?: FormQuestionOption[]; // For radio/checkbox
}

export interface Form {
   id: number;
   title: string;
   description?: string;
   creator_id: number;
   creator_username?: string;
   created_at: string;
   form_type?: 'general' | 'service';
   service_name?: string;
   subservice_name?: string;
   form_price?: number; // Optional price for paid forms (default 0 = free)
   questions?: FormQuestion[]; // Populated when fetching full form details
 }

export interface FormSubmission {
  id: number;
  form_id: number;
  submitter_id?: number;
  submitter_username?: string;
  submitted_at: string;
  answers: { question_text: string; answer_text: string }[];
}

// Prediction Market types
export interface MarketOption {
  id: number;
  market_id: number;
  option_text: string;
  // --- Runtime fields from backend stats ---
  amount?: number; // Total 'amount' traded on this option
  probability?: number; // Calculated probability
}

export interface MarketTrade {
  option_id: number;
  amount: number;
}

export interface Market {
  id: number;
  question: string;
  description?: string;
  creator_id: number;
  creator_username?: string;
  created_at: string;
  options: MarketOption[]; // Populated with stats when fetched
  user_trades?: MarketTrade[]; // If fetched for a logged-in user
}

// Shop types
export interface Shop {
  id: string;
  name: string;
  description?: string;
  owner_id: number;
  owner_username?: string;
  theme?: string;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock: number;
  category?: string;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: number;
  customer_username?: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  created_at: string;
}