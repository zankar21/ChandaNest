export type LeadStage =
  | "new"
  | "contacted"
  | "site_visit"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type LeadPriority = "low" | "medium" | "high";

export type LeadSubjectKind = "property" | "project" | "general";

export type LeadChannel = "web" | "phone" | "whatsapp" | "agent" | "import";

export type LeadSubject = {
  kind: LeadSubjectKind;
  propertyId?: string;
  projectId?: string;
  projectSlug?: string;
  title?: string;
  href?: string;
  city?: string;
  area?: string;
};

export type LeadContact = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
};

export type LeadStatus = {
  isOpen: boolean;
  lostReason?: string;
};

export type LeadAssignee = {
  uid: string;
  name?: string;
  role?: string;
};

export type LeadSource = {
  channel: LeadChannel;
  page?: "property" | "project" | "home" | "map" | "search";
  utm?: { source?: string; medium?: string; campaign?: string };
  userAgent?: string;
  ipHash?: string;
};

export type LeadDoc = {
  id: string;
  tenantId: string;
  subject: LeadSubject;
  contact: LeadContact;
  stage: LeadStage;
  status: LeadStatus;
  assignee?: LeadAssignee;
  source: LeadSource;
  priority: LeadPriority;
  tags?: string[];
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  lastContactedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type LeadNoteDoc = {
  id: string;
  leadId: string;
  tenantId: string;
  type: "note" | "call" | "whatsapp" | "email" | "system";
  text: string;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  createdBy: { uid: string; name?: string; role?: string };
};
