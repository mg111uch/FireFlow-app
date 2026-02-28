// n
// Main Post type used across the application
export interface Post {
  id: number;
  title: string;
  content?: string;
  user_id: number;
  username: string;
  community_id: number;
  community_name: string;
  image_url?: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  views: number;
  is_saved?: boolean;
  user_vote_type?: 1 | -1 | null;
}
// n
// Community type
export interface Community {
  id: number;
  name: string;
  description: string;
  creator_id: number;
  creator_username?: string; // Optional because not always fetched
  member_count?: number; // Optional because not always fetched
}
// n
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
// y
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
// y
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
  emoji: string;
}

// n
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
// n
// Form types
export interface FormQuestionOption {
  id?: number; // Optional if not yet saved to DB
  option_text: string;
}
// n
export interface FormQuestion {
  id?: number; // Optional if not yet saved to DB
  question_text: string;
  question_type: 'text' | 'textarea' | 'radio';
  order_index?: number; // Backend handles this
  options?: FormQuestionOption[]; // For radio/checkbox
}
// n
export interface Form {
  id: number;
  title: string;
  description?: string;
  creator_id: number;
  creator_username?: string;
  created_at: string;
  questions?: FormQuestion[]; // Populated when fetching full form details
}
// n
export interface FormSubmission {
  id: number;
  form_id: number;
  submitter_id?: number;
  submitter_username?: string;
  submitted_at: string;
  answers: { question_text: string; answer_text: string }[];
}
// n
// Prediction Market types
export interface MarketOption {
  id: number;
  market_id: number;
  option_text: string;
  // --- Runtime fields from backend stats ---
  amount?: number; // Total 'amount' traded on this option
  probability?: number; // Calculated probability
}
// n
export interface MarketTrade {
  option_id: number;
  amount: number;
}
// n
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