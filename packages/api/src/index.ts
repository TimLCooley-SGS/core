export { getConfig } from "./config";
export type { Config } from "./config";

export {
  getControlPlaneClient,
  getControlPlaneClientForUser,
} from "./control-plane";

export {
  getTenantClient,
  getTenantClientForUser,
  removeTenantClient,
} from "./tenant";

export {
  getOrgBySlug,
  getOrgById,
  getLinksForIdentity,
  getTenantClientBySlug,
  getTenantClientForIdentity,
} from "./org-router";

export {
  resolveCapabilities,
  resolveCapabilityKeys,
  hasCapability,
  hasAnyCapability,
  hasAllCapabilities,
} from "./permissions";

export {
  sendEmail,
  emailLayout,
  sendDonationReceipt,
  sendMembershipWelcome,
  sendTicketConfirmation,
} from "./email";

export {
  getSgsStaffByIdentity,
  getAllOrganizations,
  getOrgByIdAdmin,
  getOrgMemberCount,
  getAllStaff,
  type StaffWithIdentity,
} from "./staff";

export {
  ensureOrgAssetsBucket,
  uploadOrgLogo,
  deleteOrgLogo,
} from "./storage";
