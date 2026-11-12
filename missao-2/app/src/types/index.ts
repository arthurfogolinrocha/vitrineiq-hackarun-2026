export interface MissionItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  priority: 'must' | 'should' | 'could';
  data?: Record<string, unknown>;
}

export interface AIAnalysisRequest {
  prompt: string;
  context?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface AIAnalysisResponse {
  success: boolean;
  content: string;
  confidence: number;
  tokensUsed?: number;
  latencyMs: number;
  cached?: boolean;
  timestamp: string;
}

export interface SystemAuditLog {
  id: string;
  action: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details: string;
  timestamp: string;
  securityHash: string;
}
