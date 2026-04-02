export interface ReviewComment {
  file: string;
  line: number;
  type: 'issue' | 'suggestion' | 'praise';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  suggestion: string;
}

export interface GeminiResponse {
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  comments: ReviewComment[];
}

export interface PRContext {
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  description: string;
  diff: string;
  changedFiles: Array<{
    filename: string;
    patch: string;
    additions: number;
    deletions: number;
  }>;
}
