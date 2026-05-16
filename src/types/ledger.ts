export interface WorkspaceRoom {
  id: string; // e.g., "room-compA-compB-deal01"
  created_at: string;
  associated_domains: string[]; // ['companyA.com', 'companyB.com']
  buyer: string;
  supplier: string;
}

export interface WorkspaceDeal {
  id: string;
  created_at: string;
  topic_name: string;
  supplier: string;
  buyer: string;
  shared_room_id: string;
  internal_room_id: string;
}

export interface ActionItem {
  task: string;
  assignee_domain: string;
  status: "pending" | "completed";
}

export interface RoomSummary {
  summary_markdown: string;
  action_items: ActionItem[];
  updated_at: string;
}

export interface LedgerChunk {
  id?: string;
  workspace_id: string; // Structural Partition Key for Isolation
  uploaded_by: string;
  timestamp: string;
  source_type: string;
  raw_text: string;
  summary_markdown: string;
  action_items: ActionItem[];
  embedding_vector?: number[]; // 768 Floating point array
  file_data?: string;
  file_name?: string;
}
