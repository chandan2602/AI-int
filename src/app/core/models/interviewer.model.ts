export interface Interviewer {
  id: number;
  agent_id: string;
  name: string;
  description: string;
  image: string;
  audio?: string;
  empathy: number;
  exploration: number;
  rapport: number;
  speed: number;
}
