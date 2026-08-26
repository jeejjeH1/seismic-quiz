export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  score: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface QuestionPayload {
  index: number;
  total: number;
  text: string;
  options: string[];
  timer: number;
  startedAt: number;
  deadline: number;
}

export interface StatsPayload {
  answered: number;
  total: number;
}

export interface RoomState {
  phase: "lobby" | "question" | "reveal" | "finished";
  currentIndex: number;
  startedAt: number;
  deadline: number;
  correctIndex: number;
}

export interface QuestionDTO {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timer: number;
  order: number;
}

export interface QuizSummary {
  id: string;
  title: string;
  code: string;
  hostToken?: string;
}
