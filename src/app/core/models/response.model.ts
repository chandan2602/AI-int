export interface InterviewResponse {
  id: number;
  created_at?: string;
  interview_id: string;
  name?: string;
  email?: string;
  call_id?: string;
  duration?: number;
  details?: any;
  is_analysed?: boolean;
  is_ended?: boolean;
  is_viewed?: boolean;
  analytics?: Analytics;
  candidate_status?: string;
  tab_switch_count?: number;
}

export interface Analytics {
  overallScore: number;
  overallFeedback: string;
  communication?: { score: number; feedback: string };
  generalIntelligence: string;
  softSkillSummary: string;
  questionSummaries: Array<{ question: string; summary: string }>;
}
