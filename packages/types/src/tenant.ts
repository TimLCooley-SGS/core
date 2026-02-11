// Tenant database types

export type PersonStatus = 'active' | 'inactive' | 'merged';
export type HouseholdRole = 'primary' | 'co_primary' | 'dependent' | 'other';
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment';
export type MembershipPlanStatus = 'active' | 'archived';
export type SeatAction = 'assigned' | 'unassigned' | 'transferred';
export type StaffAssignmentStatus = 'active' | 'inactive';
export type OverrideType = 'grant' | 'revoke';
export type MergeRequestStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type MergeLogAction = 'fk_repointed' | 'field_updated' | 'archived';
export type VisitType = 'day_pass' | 'member_visit' | 'event' | 'program' | 'other';
export type AuditActorType = 'staff' | 'patron' | 'system' | 'sgs_support';
export type AuditAction = 'create' | 'update' | 'delete' | 'merge' | 'login' | 'logout' | 'assign' | 'unassign' | 'transfer';

export interface Person {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  global_identity_id: string | null;
  login_enabled: boolean;
  status: PersonStatus;
  merged_into_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Capability {
  id: string;
  resource: string;
  action: string;
  key: string;
  description: string | null;
  category: string | null;
  sort_order: number;
}

export interface RoleCapability {
  role_id: string;
  capability_id: string;
}

export interface StaffAssignment {
  id: string;
  person_id: string;
  role_id: string;
  status: StaffAssignmentStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffCapabilityOverride {
  id: string;
  staff_assignment_id: string;
  capability_id: string;
  override_type: OverrideType;
  granted_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface Household {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  person_id: string;
  role: HouseholdRole;
  can_manage_logins: boolean;
  joined_at: string;
  removed_at: string | null;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  seat_count: number;
  price_cents: number;
  currency: string;
  duration_days: number;
  is_recurring: boolean;
  stripe_price_id: string | null;
  status: MembershipPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  membership_plan_id: string;
  purchased_by_person_id: string;
  household_id: string | null;
  status: MembershipStatus;
  starts_at: string;
  ends_at: string;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipSeat {
  id: string;
  membership_id: string;
  seat_number: number;
  person_id: string | null;
  assigned_at: string | null;
  assigned_by_person_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipSeatHistory {
  id: string;
  membership_seat_id: string;
  person_id: string | null;
  action: SeatAction;
  performed_by_person_id: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  person_id: string;
  amount_cents: number;
  currency: string;
  campaign: string | null;
  donation_date: string;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  person_id: string;
  visit_type: VisitType;
  visited_at: string;
  notes: string | null;
  created_at: string;
}

export interface PersonMergeRequest {
  id: string;
  source_person_id: string;
  target_person_id: string;
  status: MergeRequestStatus;
  requested_by: string;
  reviewed_by: string | null;
  merge_strategy: Record<string, unknown>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonMergeLog {
  id: string;
  merge_request_id: string;
  table_name: string;
  record_id: string;
  action: MergeLogAction;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_person_id: string | null;
  actor_type: AuditActorType;
  impersonation_session_id: string | null;
  impersonated_by_email: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockedDate {
  id: string;
  location_id: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

// Membership Card Designs

export type MembershipCardField =
  | 'program_name'
  | 'member_name'
  | 'membership_id'
  | 'status'
  | 'expiration_date'
  | 'start_date'
  | 'amount'
  | 'seat_count'
  | 'barcode'
  | 'member_since';

export interface MembershipCardOptions {
  print: boolean;
  download_pdf: boolean;
  apple_wallet: boolean;
  google_wallet: boolean;
  push_notifications: boolean;
}

export interface MembershipCardDesign {
  id: string;
  name: string;
  pdf_name: string | null;
  status: MembershipPlanStatus;
  front_fields: MembershipCardField[];
  back_fields: MembershipCardField[];
  font_color: string;
  accent_color: string;
  background_color: string;
  front_image_url: string | null;
  default_side: 'front' | 'back';
  is_default: boolean;
  card_options: MembershipCardOptions;
  restricted_plan_ids: string[] | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Membership Portal

export type PortalModuleType = 'text' | 'video' | 'pdf' | 'audio' | 'html' | 'file_download';
export type PortalModuleStatus = 'draft' | 'published' | 'archived';
export type PortalAnnouncementStatus = 'draft' | 'published' | 'archived';
export type PortalQuestionStatus = 'pending' | 'answered' | 'archived';

export interface PortalSettings {
  id: string;
  is_published: boolean;
  hero_image_url: string | null;
  welcome_heading: string;
  welcome_body: string;
  button_text: string;
  helper_text: string;
  accent_color: string;
  restricted_card_design_ids: string[] | null;
  portal_slug: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalModule {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  module_type: PortalModuleType;
  content_html: string | null;
  embed_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  status: PortalModuleStatus;
  restricted_card_design_ids: string[] | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  content_html: string;
  status: PortalAnnouncementStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalQuestion {
  id: string;
  person_id: string | null;
  subject: string;
  content: string;
  status: PortalQuestionStatus;
  answer_html: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Tickets

export type TicketMode = 'timed_entry' | 'daily_admission';
export type TicketStatus = 'draft' | 'active' | 'archived';
export type PricingMode = 'flat' | 'semi_dynamic' | 'full_dynamic';
export type PurchaseWindow = '2_weeks' | '30_days' | '60_days' | '90_days' | 'none';

export interface SellingChannels {
  in_person_counter: boolean;
  in_person_kiosk: boolean;
  online: boolean;
}

export interface DeliveryFormats {
  email: boolean;
  google_wallet: boolean;
  apple_wallet: boolean;
}

export interface EmailSettings {
  post_purchase: boolean;
  reminder_1day: boolean;
  reminder_1hour: boolean;
  day_after: boolean;
}

export interface DayPrices {
  mon: number | null;
  tue: number | null;
  wed: number | null;
  thu: number | null;
  fri: number | null;
  sat: number | null;
  sun: number | null;
}

export interface TicketType {
  id: string;
  name: string;
  description: string | null;
  ticket_mode: TicketMode;
  location_id: string | null;
  tags: string[];
  banner_image_url: string | null;
  square_image_url: string | null;
  include_terms: boolean;
  pricing_mode: PricingMode;
  guest_allowance: number;
  purchase_window: PurchaseWindow;
  timed_interval_minutes: number | null;
  entry_window_minutes: number | null;
  selling_channels: SellingChannels;
  delivery_formats: DeliveryFormats;
  email_settings: EmailSettings;
  status: TicketStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketPriceType {
  id: string;
  ticket_type_id: string;
  name: string;
  price_cents: number | null;
  day_prices: DayPrices | null;
  target_price_cents: number | null;
  tax_rate: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/* ── Tags ── */

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface PersonTag {
  id: string;
  person_id: string;
  tag_id: string;
  created_at: string;
}

export interface TicketTag {
  id: string;
  ticket_type_id: string;
  tag_id: string;
  created_at: string;
}

/* ── Contact Lists ── */

export type ContactListType = 'smart' | 'static';
export type FilterLogic = 'and' | 'or';
export type FilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'
  | 'is_null'
  | 'is_not_null'
  | 'includes_any'
  | 'includes_all'
  | 'includes_none'
  | 'gte'
  | 'lte';

export interface FilterCondition {
  field: string;
  op: FilterOp;
  value: string | string[] | boolean | null;
}

export interface FilterRules {
  logic: FilterLogic;
  conditions: FilterCondition[];
}

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  type: ContactListType;
  filter_rules: FilterRules | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactListMember {
  id: string;
  list_id: string;
  person_id: string;
  added_at: string;
  added_by: string | null;
}

/* ── Ticket Designs ── */

export interface TicketDesignFieldConfig {
  guest_name: boolean;
  date: boolean;
  time: boolean;
  barcode: boolean;
  event_name: boolean;
  location: boolean;
  ticket_price: boolean;
  ticket_number: boolean;
  order_number: boolean;
  registrant_name: boolean;
}

export type TicketDesignFieldKey = keyof TicketDesignFieldConfig;

export interface TicketDesignOptions {
  mobile_pdf: boolean;
  print_tickets: boolean;
  download_tickets: boolean;
  display_tickets_first: boolean;
  qr_code: boolean;
}

export type TicketDesignOptionKey = keyof TicketDesignOptions;

export interface TicketDesign {
  id: string;
  name: string;
  status: MembershipPlanStatus;
  field_config: TicketDesignFieldConfig;
  options: TicketDesignOptions;
  background_color: string;
  font_color: string;
  body_text: string;
  terms_text: string;
  is_default: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
