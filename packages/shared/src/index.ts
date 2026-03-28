export interface Metrics {
  wpm: number;
  accuracy: number;
  netWpm: number;
  efficiency: number;
}

export interface UserDTO {
  id: string;
  email: string;
  createdAt: string;
}

export interface SessionDTO {
  id: string;
  userId: string;
  textLength: number;
  timeTakenMs: number;
  wpm: number;
  accuracy: number;
  netWpm: number;
  generationTimeMs: number;
  efficiency: number;
  imageUrl: string;
  targetText: string;
  typedText: string;
  createdAt: string;
}

export interface AnalyzeRequest {
  targetText: string;
  typedText: string;
  timeTakenMs: number;
}

export interface AnalyzeResponse {
  sessionId: string;
  metrics: Metrics;
  imageUrl: string;
  generationTimeMs: number;
}

export interface HistoryResponse {
  sessions: SessionDTO[];
}

export interface HistoryItemResponse {
  session: SessionDTO;
}

export interface AuthResponse {
  user: UserDTO;
  tokenIssuedAt: string;
}
