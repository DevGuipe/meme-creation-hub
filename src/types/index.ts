// Shared type definitions for the application

export interface Layer {
  id: string;
  type: 'background' | 'body' | 'head' | 'prop' | 'text';
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  // Text-specific properties
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  textShadow?: string;
  textAlign?: string;
}

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}

export interface Meme {
  id: string;
  id_short: string;
  owner_id: string; // FIXED: Added missing owner_id field
  template_key: string;
  layers_payload: Layer[];
  image_urls: Record<string, string>;
  created_at: string;
}

export interface PopcatStats {
  totalScore: number;
  weeklyScore: number;
  rank: number;
  weeklyRank: number;
  badge: string;
  recentEvents: Array<{
    source: string;
    amount: number;
    created_at: string;
  }>;
}