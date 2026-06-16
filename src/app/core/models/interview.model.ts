export interface Question {
  id: string;
  question: string;
  follow_up_count: number;
}

export interface Interview {
  id: string;
  created_at?: string;
  name: string;
  description?: string;
  objective?: string;
  organization_id?: string;
  user_id?: string;
  interviewer_id?: number | null;
  is_active?: boolean;
  is_anonymous?: boolean;
  logo_url?: string;
  theme_color?: string;
  url?: string;
  readable_slug?: string;
  questions?: Question[];
  question_count?: number;
  response_count?: number;
  time_duration?: string;
  insights?: string[];
  drive_id?: string;
  drive_name?: string;
}
