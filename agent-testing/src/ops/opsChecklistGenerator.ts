import type {
  AgentRole,
  MarkdownString,
  OpsRisk,
  TestPriority,
} from '../types';

export type DeploymentMode =
  | 'local_only'
  | 'lan_server'
  | 'single_vps'
  | 'cloud_server'
  | 'containerized'
  | 'unknown';

export type OpsCheckCategory =
  | 'deployment'
  | 'authentication'
  | 'authorization'
  | 'backup'
  | 'restore'
  | 'logging'
  | 'monitoring'
  | 'database'
  | 'file_storage'
  | 'search'
  | 'network_exposure'
  | 'environment_variables'
  | 'multi_user_usage'
  | 'maintenance'
  | 'security'
  | 'unknown';

export type OpsCheckExecutionType =
  | 'static_review'
  | 'manual_verification'
  | 'script'
  | 'api'
  | 'browser'
  | 'database'
  | 'log_review'
  | 'mcp_future';

export type UserScale =
  | 'single_user'
  | 'small_team'
  | 'team_10_30'
  | 'larger_team'
  | 'unknown';

export interface OpsChecklistInput {
  targetSystemName: MarkdownString;
  targetSystemType: MarkdownString;
  deploymentMode: DeploymentMode;
  userScale?: UserScale | number | MarkdownString;
  modules: MarkdownString[];
  hasAuthentication?: boolean;
  hasAuthorization?: boolean;
  hasFileUpload?: boolean;
  hasSearch?: boolean;
  hasBackup?: boolean;
  hasRestore?: boolean;
  hasLogging?: boolean;
  hasMonitoring?: boolean;
  hasPublicAccess?: boolean;
  hasDatabase?: boolean;
  hasExternalStorage?: boolean;
  hasMultiUserUsage?: boolean;
  hasAdminRole?: boolean;
  knownConstraints?: MarkdownString[];
  knownOpsRisks?: OpsRisk[] | MarkdownString[];
}

export interface OpsChecklistItem {
  id: MarkdownString;
  title: MarkdownString;
  category: OpsCheckCategory;
  description: MarkdownString;
  priority: TestPriority;
  requiredEvidence: MarkdownString[];
  suggestedExecutionType: OpsCheckExecutionType;
  relatedRisk: MarkdownString;
  blockingIfFailed: boolean;
  ownerAgent: AgentRole;
  tags: string[];
  notes: MarkdownString[];
}

export interface OpsChecklistOutput {
  items: OpsChecklistItem[];
  releaseBlockingChecks: OpsChecklistItem[];
  recommendedEvidence: MarkdownString[];
  unknowns: MarkdownString[];
  limitations: MarkdownString[];
}

type ItemSeed = Omit<OpsChecklistItem, 'id' | 'ownerAgent' | 'tags' | 'notes'> & {
  tags?: string[];
  notes?: MarkdownString[];
};

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeKnownRisk(risk: OpsRisk | MarkdownString): MarkdownString {
  return typeof risk === 'string'
    ? risk
    : `${risk.area}: ${risk.description} (${risk.severity})`;
}

function hasTeamScale(userScale: OpsChecklistInput['userScale']): boolean {
  if (typeof userScale === 'number') {
    return userScale >= 10;
  }

  if (!userScale) {
    return false;
  }

  const normalized = userScale.toLowerCase();

  return (
    normalized === 'team_10_30' ||
    normalized === 'larger_team' ||
    normalized.includes('10') ||
    normalized.includes('30') ||
    normalized.includes('team')
  );
}

function collectUnknowns(input: OpsChecklistInput): MarkdownString[] {
  const unknowns: MarkdownString[] = [];

  if (input.deploymentMode === 'unknown') {
    unknowns.push('Deployment mode is unknown; live deployment checks are limited to generic maintenance items.');
  }

  if (!input.targetSystemName.trim()) {
    unknowns.push('Target system name is missing.');
  }

  if (!input.targetSystemType.trim()) {
    unknowns.push('Target system type is missing.');
  }

  if (input.modules.length === 0) {
    unknowns.push('Known modules are missing; checklist cannot map checks to concrete feature areas.');
  }

  const booleanFields: Array<keyof Pick<
    OpsChecklistInput,
    | 'hasAuthentication'
    | 'hasAuthorization'
    | 'hasFileUpload'
    | 'hasSearch'
    | 'hasBackup'
    | 'hasRestore'
    | 'hasLogging'
    | 'hasMonitoring'
    | 'hasPublicAccess'
    | 'hasDatabase'
    | 'hasExternalStorage'
    | 'hasMultiUserUsage'
    | 'hasAdminRole'
  >> = [
    'hasAuthentication',
    'hasAuthorization',
    'hasFileUpload',
    'hasSearch',
    'hasBackup',
    'hasRestore',
    'hasLogging',
    'hasMonitoring',
    'hasPublicAccess',
    'hasDatabase',
    'hasExternalStorage',
    'hasMultiUserUsage',
    'hasAdminRole',
  ];

  for (const field of booleanFields) {
    if (input[field] === undefined) {
      unknowns.push(`${field} is unknown.`);
    }
  }

  return unknowns;
}

function createItemFactory(targetSystemName: MarkdownString): {
  add(seed: ItemSeed): void;
  items: OpsChecklistItem[];
} {
  const counters = new Map<OpsCheckCategory, number>();
  const items: OpsChecklistItem[] = [];

  return {
    items,
    add(seed: ItemSeed): void {
      const next = (counters.get(seed.category) ?? 0) + 1;
      counters.set(seed.category, next);

      items.push({
        ...seed,
        id: `OPS-${seed.category.toUpperCase().replace(/_/g, '-')}-${String(next).padStart(3, '0')}`,
        ownerAgent: 'ops_check',
        tags: uniqueList([
          targetSystemName || 'unknown-system',
          seed.category,
          ...(seed.tags ?? []),
        ]),
        notes: seed.notes ?? [],
      });
    },
  };
}

function addDeploymentChecks(input: OpsChecklistInput, add: (seed: ItemSeed) => void): void {
  if (input.deploymentMode === 'local_only' || input.deploymentMode === 'unknown') {
    return;
  }

  add({
    title: 'Service access is verified after deployment',
    category: 'deployment',
    description: 'Verify the deployed service can be reached through the documented access path.',
    priority: 'high',
    requiredEvidence: ['human observation', 'browser screenshot', 'API response'],
    suggestedExecutionType: 'browser',
    relatedRisk: 'Core deployment may be unreachable after release.',
    blockingIfFailed: true,
    tags: ['deployment', input.deploymentMode],
  });
  add({
    title: 'Frontend and backend deployment versions match',
    category: 'deployment',
    description: 'Confirm UI bundle, backend service, and documented version or commit belong to the same release.',
    priority: 'medium',
    requiredEvidence: ['deployment document', 'version output', 'config snippet'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Version mismatch can create hard-to-diagnose runtime defects.',
    blockingIfFailed: false,
    tags: ['deployment'],
  });
  add({
    title: 'Required environment variables are complete',
    category: 'environment_variables',
    description: 'Check that required runtime variables are listed, populated, and scoped to the target environment.',
    priority: 'high',
    requiredEvidence: ['environment variable checklist', 'config snippet'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Missing environment variables can prevent startup or disable key features.',
    blockingIfFailed: true,
    tags: ['deployment', 'env'],
  });
  add({
    title: 'Service recovers after restart',
    category: 'deployment',
    description: 'Verify the service restart process and expected recovery state are documented for the target environment.',
    priority: 'high',
    requiredEvidence: ['restart record', 'human observation', 'command output'],
    suggestedExecutionType: 'mcp_future',
    relatedRisk: 'A restart may leave the system unavailable or partially initialized.',
    blockingIfFailed: true,
    tags: ['deployment', 'recovery'],
  });
  add({
    title: 'Port and reverse proxy configuration is explicit',
    category: 'network_exposure',
    description: 'Review exposed ports, reverse proxy routes, and service boundaries for the deployed mode.',
    priority: 'medium',
    requiredEvidence: ['deployment document', 'reverse proxy config snippet', 'port mapping record'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Ambiguous port or proxy configuration can expose internal services or break access.',
    blockingIfFailed: false,
    tags: ['network', 'deployment'],
  });
}

function addAuthenticationChecks(add: (seed: ItemSeed) => void): void {
  add({
    title: 'Unauthenticated users cannot access protected pages',
    category: 'authentication',
    description: 'Verify protected pages redirect, reject, or otherwise block access without login.',
    priority: 'high',
    requiredEvidence: ['browser screenshot', 'API response', 'human observation'],
    suggestedExecutionType: 'browser',
    relatedRisk: 'Authentication bypass can expose private data or workflows.',
    blockingIfFailed: true,
    tags: ['auth', 'security'],
  });
  add({
    title: 'Failed login shows a clear non-sensitive message',
    category: 'authentication',
    description: 'Verify invalid credentials produce a user-facing error without internal details.',
    priority: 'medium',
    requiredEvidence: ['browser screenshot', 'API response'],
    suggestedExecutionType: 'browser',
    relatedRisk: 'Confusing or overly detailed login errors can leak information or block users.',
    blockingIfFailed: false,
    tags: ['auth'],
  });
  add({
    title: 'Expired sessions require re-authentication',
    category: 'authentication',
    description: 'Verify expired or invalid sessions cannot continue protected actions.',
    priority: 'high',
    requiredEvidence: ['browser screenshot', 'API response', 'session expiry observation'],
    suggestedExecutionType: 'mcp_future',
    relatedRisk: 'Stale sessions can allow unauthorized access.',
    blockingIfFailed: true,
    tags: ['auth', 'security'],
  });
  add({
    title: 'Abnormal login attempts do not expose internals',
    category: 'security',
    description: 'Verify unusual login inputs and failures do not reveal stack traces, secrets, or implementation details.',
    priority: 'high',
    requiredEvidence: ['API response', 'browser screenshot', 'log excerpt'],
    suggestedExecutionType: 'api',
    relatedRisk: 'Authentication errors may leak sensitive implementation details.',
    blockingIfFailed: true,
    tags: ['auth', 'security'],
  });
}

function addAuthorizationChecks(add: (seed: ItemSeed) => void): void {
  add({
    title: 'Regular users cannot access administrator functions',
    category: 'authorization',
    description: 'Verify non-admin accounts cannot reach or execute administrator-only workflows.',
    priority: 'high',
    requiredEvidence: ['browser screenshot', 'API response', 'permission matrix'],
    suggestedExecutionType: 'browser',
    relatedRisk: 'Privilege escalation can allow unauthorized data or configuration changes.',
    blockingIfFailed: true,
    tags: ['permission', 'admin'],
  });
  add({
    title: 'Users cannot access other users private data',
    category: 'authorization',
    description: 'Verify private records remain isolated between user accounts.',
    priority: 'high',
    requiredEvidence: ['API response', 'browser screenshot', 'database check'],
    suggestedExecutionType: 'api',
    relatedRisk: 'Private data leak or permission bypass.',
    blockingIfFailed: true,
    tags: ['permission', 'privacy'],
  });
  add({
    title: 'Shared data is visible only to authorized users',
    category: 'authorization',
    description: 'Verify shared resources respect membership, ownership, or role rules.',
    priority: 'high',
    requiredEvidence: ['permission matrix', 'API response', 'browser screenshot'],
    suggestedExecutionType: 'api',
    relatedRisk: 'Shared records may be exposed beyond intended users.',
    blockingIfFailed: true,
    tags: ['permission', 'sharing'],
  });
  add({
    title: 'Administrator permission boundaries are documented',
    category: 'authorization',
    description: 'Review which actions administrators can perform and where elevated access stops.',
    priority: 'medium',
    requiredEvidence: ['deployment document', 'permission matrix'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Unclear admin boundaries make security review and incident response unreliable.',
    blockingIfFailed: false,
    tags: ['permission', 'admin'],
  });
}

function addBackupChecks(add: (seed: ItemSeed) => void): void {
  const common = {
    category: 'backup' as const,
    tags: ['backup', 'data-safety'],
  };

  add({
    ...common,
    title: 'Backup task exists',
    description: 'Verify a backup job, script, or documented manual procedure exists.',
    priority: 'high',
    requiredEvidence: ['backup script reference', 'deployment document', 'schedule record'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Critical business data may be unprotected.',
    blockingIfFailed: true,
  });
  add({
    ...common,
    title: 'Backup artifact is generated',
    description: 'Verify the backup process produces an expected artifact.',
    priority: 'high',
    requiredEvidence: ['backup artifact', 'command output', 'human observation'],
    suggestedExecutionType: 'mcp_future',
    relatedRisk: 'Backup exists on paper but may not produce recoverable data.',
    blockingIfFailed: true,
  });
  add({
    ...common,
    title: 'Backup storage location is known',
    description: 'Confirm where backup artifacts are stored and who can access them.',
    priority: 'high',
    requiredEvidence: ['backup artifact path', 'storage policy', 'deployment document'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Backup artifacts may be lost, inaccessible, or overexposed.',
    blockingIfFailed: true,
  });
  add({
    ...common,
    title: 'Backup failure is recorded or alerted',
    description: 'Verify failed backups create a log entry, visible status, or alert path.',
    priority: 'medium',
    requiredEvidence: ['log excerpt', 'alert record', 'backup failure record'],
    suggestedExecutionType: 'log_review',
    relatedRisk: 'Silent backup failure can leave data unprotected.',
    blockingIfFailed: false,
  });
  add({
    ...common,
    title: 'Backup includes critical business data',
    description: 'Verify backup scope covers records, attachments, configuration needed for recovery, and key metadata.',
    priority: 'high',
    requiredEvidence: ['backup manifest', 'database check', 'file listing'],
    suggestedExecutionType: 'mcp_future',
    relatedRisk: 'Partial backup may not restore the system to a usable state.',
    blockingIfFailed: true,
  });
}

function addRestoreChecks(add: (seed: ItemSeed) => void): void {
  const common = {
    category: 'restore' as const,
    tags: ['restore', 'data-safety'],
  };

  add({
    ...common,
    title: 'Restore procedure exists',
    description: 'Verify a documented restore path exists for the target deployment mode.',
    priority: 'high',
    requiredEvidence: ['restore document', 'runbook'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Recovery cannot be performed reliably during incident response.',
    blockingIfFailed: true,
  });
  add({
    ...common,
    title: 'Data can be restored from backup',
    description: 'Verify a backup can be restored in a test or controlled environment.',
    priority: 'high',
    requiredEvidence: ['restore record', 'backup artifact', 'database check'],
    suggestedExecutionType: 'mcp_future',
    relatedRisk: 'Backup may be unusable when recovery is needed.',
    blockingIfFailed: true,
  });
  add({
    ...common,
    title: 'Restored data consistency can be verified',
    description: 'Verify restored records, attachments, counts, and critical workflows are consistent.',
    priority: 'high',
    requiredEvidence: ['database check', 'restore record', 'human observation'],
    suggestedExecutionType: 'database',
    relatedRisk: 'Restore may silently corrupt or omit data.',
    blockingIfFailed: true,
  });
  add({
    ...common,
    title: 'Restore process does not overwrite newer data unexpectedly',
    description: 'Confirm restore documentation handles overwrite, merge, and rollback behavior explicitly.',
    priority: 'high',
    requiredEvidence: ['restore document', 'restore record', 'operator note'],
    suggestedExecutionType: 'static_review',
    relatedRisk: 'Restore can cause data loss if overwrite behavior is unsafe.',
    blockingIfFailed: true,
  });
  add({
    ...common,
    title: 'Restore drill is recorded',
    description: 'Verify restore drills have a date, operator, source backup, result, and limitations.',
    priority: 'medium',
    requiredEvidence: ['restore drill record', 'operator note'],
    suggestedExecutionType: 'manual_verification',
    relatedRisk: 'Untested restore procedures may fail under pressure.',
    blockingIfFailed: false,
  });
}

function addLoggingChecks(add: (seed: ItemSeed) => void): void {
  const common = {
    category: 'logging' as const,
    priority: 'medium' as TestPriority,
    suggestedExecutionType: 'log_review' as OpsCheckExecutionType,
    blockingIfFailed: false,
    tags: ['logging'],
  };

  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[]]> = [
    ['Login failures are logged', 'Verify failed login events are recorded with safe diagnostic detail.', ['log excerpt', 'login failure observation']],
    ['Save failures are logged', 'Verify failed create/update operations are recorded for diagnosis.', ['log excerpt', 'failed save observation']],
    ['Upload failures are logged', 'Verify upload errors include enough context to diagnose file and storage issues.', ['log excerpt', 'upload failure observation']],
    ['Permission denials are logged', 'Verify denied authorization attempts are recorded without leaking private data.', ['log excerpt', 'permission denial observation']],
    ['Service exceptions are logged', 'Verify server-side exceptions produce a searchable diagnostic record.', ['log excerpt', 'exception record']],
    ['Logs avoid sensitive data leakage', 'Review logs for tokens, passwords, private content, or unnecessary personal data.', ['log excerpt', 'redaction review note']],
  ];

  for (const [title, description, requiredEvidence] of checks) {
    add({
      ...common,
      title,
      description,
      requiredEvidence,
      relatedRisk: title.includes('sensitive')
        ? 'Logs can leak private data or secrets.'
        : 'Missing logs can block diagnosis of production issues.',
      blockingIfFailed: title.includes('sensitive'),
    });
  }
}

function addMonitoringChecks(add: (seed: ItemSeed) => void): void {
  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[]]> = [
    ['Service status is observable', 'Verify service availability can be checked by an operator.', ['monitoring screenshot', 'health check response']],
    ['CPU memory and disk are observable', 'Verify basic host or container resource usage can be inspected.', ['monitoring screenshot', 'command output']],
    ['Low disk space can be discovered', 'Verify there is an operator-visible way to notice storage exhaustion.', ['monitoring screenshot', 'alert record']],
    ['Service unavailable condition can be discovered', 'Verify outage detection exists through monitoring, health check, or manual runbook.', ['alert record', 'health check response']],
  ];

  for (const [title, description, requiredEvidence] of checks) {
    add({
      title,
      category: 'monitoring',
      description,
      priority: 'medium',
      requiredEvidence,
      suggestedExecutionType: 'mcp_future',
      relatedRisk: 'Operational issues may go unnoticed until users report them.',
      blockingIfFailed: false,
      tags: ['monitoring'],
    });
  }
}

function addDatabaseChecks(add: (seed: ItemSeed) => void): void {
  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[], boolean]> = [
    ['Data writes are verifiable', 'Verify a successful write can be observed through the UI, API, or database.', ['database check', 'API response', 'browser screenshot'], true],
    ['Delete operations are traceable', 'Verify delete actions have audit trail, logs, or recoverable records where required.', ['log excerpt', 'database check'], false],
    ['Migration risk is controlled', 'Review migration ordering, rollback notes, and data safety assumptions.', ['migration document', 'deployment document'], true],
    ['Database connection errors are handled', 'Verify database outages produce controlled errors instead of data corruption or hidden failure.', ['API response', 'log excerpt'], true],
  ];

  for (const [title, description, requiredEvidence, blockingIfFailed] of checks) {
    add({
      title,
      category: 'database',
      description,
      priority: blockingIfFailed ? 'high' : 'medium',
      requiredEvidence,
      suggestedExecutionType: 'database',
      relatedRisk: 'Database failures can cause data loss, hidden write failure, or release instability.',
      blockingIfFailed,
      tags: ['database', 'data-safety'],
    });
  }
}

function addFileStorageChecks(add: (seed: ItemSeed) => void): void {
  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[], boolean]> = [
    ['Upload success is verifiable', 'Verify uploaded files can be found, opened, and linked to the correct record.', ['browser screenshot', 'attachment artifact', 'database check'], true],
    ['Upload failure shows a clear message', 'Verify invalid upload attempts give a useful non-sensitive error.', ['browser screenshot', 'API response'], false],
    ['Attachment permissions are correct', 'Verify attachments follow the same authorization rules as the parent record.', ['API response', 'browser screenshot', 'permission matrix'], true],
    ['File size and type boundaries are explicit', 'Review allowed file types, size limits, and failure behavior.', ['deployment document', 'test case description'], false],
    ['Storage exhaustion can be discovered', 'Verify low storage or write failure has a visible signal.', ['log excerpt', 'monitoring screenshot', 'command output'], false],
  ];

  for (const [title, description, requiredEvidence, blockingIfFailed] of checks) {
    add({
      title,
      category: 'file_storage',
      description,
      priority: blockingIfFailed ? 'high' : 'medium',
      requiredEvidence,
      suggestedExecutionType: title.includes('permissions') ? 'api' : 'browser',
      relatedRisk: 'File storage issues can break uploads, leak attachments, or hide capacity failures.',
      blockingIfFailed,
      tags: ['files', 'storage'],
    });
  }
}

function addSearchChecks(add: (seed: ItemSeed) => void): void {
  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[], boolean]> = [
    ['Search results are accurate for representative queries', 'Verify expected records appear for known query terms.', ['browser screenshot', 'search fixture', 'human observation'], false],
    ['Empty search result has a clear message', 'Verify no-result state is understandable and not treated as an error.', ['browser screenshot'], false],
    ['Search updates after data changes', 'Verify new or edited data becomes searchable within the expected time.', ['browser screenshot', 'API response'], false],
    ['Search results enforce permissions', 'Verify search does not return records the current user cannot access.', ['API response', 'browser screenshot', 'permission matrix'], true],
  ];

  for (const [title, description, requiredEvidence, blockingIfFailed] of checks) {
    add({
      title,
      category: 'search',
      description,
      priority: blockingIfFailed ? 'high' : 'medium',
      requiredEvidence,
      suggestedExecutionType: 'browser',
      relatedRisk: blockingIfFailed
        ? 'Search can leak private data if permission filtering fails.'
        : 'Search quality issues can make important records hard to find.',
      blockingIfFailed,
      tags: ['search'],
    });
  }
}

function addNetworkExposureChecks(add: (seed: ItemSeed) => void): void {
  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[], boolean]> = [
    ['Public access is protected by authentication', 'Verify public routes require authentication where private data or actions exist.', ['browser screenshot', 'API response'], true],
    ['Internal ports are not publicly exposed', 'Review exposed ports and confirm internal services are not directly reachable.', ['port mapping record', 'reverse proxy config snippet'], true],
    ['Administrator entry points are restricted', 'Verify admin paths and actions require elevated authorization.', ['browser screenshot', 'API response', 'permission matrix'], true],
    ['Sensitive configuration is not exposed', 'Verify public responses and static assets do not expose secrets or private config.', ['browser screenshot', 'API response', 'config review note'], true],
    ['HTTPS or access boundary is explicit', 'Verify HTTPS, LAN-only access, VPN, or another intended access boundary is documented.', ['deployment document', 'browser screenshot'], false],
  ];

  for (const [title, description, requiredEvidence, blockingIfFailed] of checks) {
    add({
      title,
      category: 'network_exposure',
      description,
      priority: blockingIfFailed ? 'high' : 'medium',
      requiredEvidence,
      suggestedExecutionType: 'static_review',
      relatedRisk: 'Public exposure can create unauthorized access or data leak risk.',
      blockingIfFailed,
      tags: ['network', 'security'],
    });
  }
}

function addMultiUserChecks(add: (seed: ItemSeed) => void): void {
  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[], boolean]> = [
    ['Multiple users can log in concurrently', 'Verify simultaneous login does not invalidate unrelated sessions.', ['browser screenshot', 'human observation'], false],
    ['Multiple users can create data concurrently', 'Verify concurrent create operations do not collide or overwrite data.', ['browser screenshot', 'database check'], true],
    ['Multiple users can edit data concurrently', 'Verify concurrent edits have conflict handling, locking, or clear last-write behavior.', ['browser screenshot', 'database check'], true],
    ['Multiple users can upload attachments concurrently', 'Verify simultaneous uploads do not mix ownership or corrupt files.', ['attachment artifact', 'browser screenshot', 'database check'], true],
    ['Multiple users can search concurrently', 'Verify concurrent searches remain responsive and permission-filtered.', ['browser screenshot', 'API response'], false],
    ['Concurrency conflicts are visible and handled', 'Verify conflict states produce clear messages or deterministic resolution.', ['browser screenshot', 'human observation'], true],
  ];

  for (const [title, description, requiredEvidence, blockingIfFailed] of checks) {
    add({
      title,
      category: 'multi_user_usage',
      description,
      priority: blockingIfFailed ? 'high' : 'medium',
      requiredEvidence,
      suggestedExecutionType: 'mcp_future',
      relatedRisk: 'Concurrent use can cause data loss, overwrite, or confusing user state.',
      blockingIfFailed,
      tags: ['multi-user', 'concurrency'],
    });
  }
}

function addMaintenanceChecks(add: (seed: ItemSeed) => void): void {
  const checks: Array<[MarkdownString, MarkdownString, MarkdownString[], TestPriority, boolean]> = [
    ['Deployment instructions exist', 'Verify an operator can deploy or redeploy from documented steps.', ['deployment document'], 'medium', false],
    ['Rollback or recovery path exists', 'Verify a documented path exists to recover after failed deployment or data incident.', ['rollback document', 'restore document'], 'high', true],
    ['Backup check frequency is defined', 'Verify backup review frequency and owner are documented.', ['maintenance document', 'backup schedule'], 'medium', false],
    ['Log viewing path is documented', 'Verify operators know where to inspect application and deployment logs.', ['maintenance document', 'log access note'], 'medium', false],
    ['Permission maintenance process exists', 'Verify user, admin, and access-review operations have an owner and process.', ['permission maintenance document'], 'medium', false],
    ['Problem owner or contact is known', 'Verify incident contact, owner, or escalation path is recorded.', ['maintenance document', 'owner record'], 'low', false],
  ];

  for (const [title, description, requiredEvidence, priority, blockingIfFailed] of checks) {
    add({
      title,
      category: 'maintenance',
      description,
      priority,
      requiredEvidence,
      suggestedExecutionType: 'static_review',
      relatedRisk: 'Long-term operation may depend on undocumented manual knowledge.',
      blockingIfFailed,
      tags: ['maintenance'],
    });
  }
}

export function generateOpsChecklist(
  input: OpsChecklistInput
): OpsChecklistOutput {
  const factory = createItemFactory(input.targetSystemName.trim());
  const add = factory.add;

  addDeploymentChecks(input, add);

  if (input.hasAuthentication) {
    addAuthenticationChecks(add);
  }

  if (input.hasAuthorization || input.hasAdminRole) {
    addAuthorizationChecks(add);
  }

  if (input.hasBackup) {
    addBackupChecks(add);
  }

  if (input.hasRestore) {
    addRestoreChecks(add);
  }

  if (input.hasLogging) {
    addLoggingChecks(add);
  }

  if (input.hasMonitoring) {
    addMonitoringChecks(add);
  }

  if (input.hasDatabase) {
    addDatabaseChecks(add);
  }

  if (input.hasFileUpload || input.hasExternalStorage) {
    addFileStorageChecks(add);
  }

  if (input.hasSearch) {
    addSearchChecks(add);
  }

  if (input.hasPublicAccess) {
    addNetworkExposureChecks(add);
  }

  if (input.hasMultiUserUsage || hasTeamScale(input.userScale)) {
    addMultiUserChecks(add);
  }

  addMaintenanceChecks(add);

  const knownRisks = (input.knownOpsRisks ?? []).map(normalizeKnownRisk);
  const constraints = input.knownConstraints ?? [];
  const unknowns = collectUnknowns(input);
  const items = factory.items;
  const recommendedEvidence = uniqueList(
    items.flatMap((item) => item.requiredEvidence)
  );

  return {
    items,
    releaseBlockingChecks: items.filter((item) => item.blockingIfFailed),
    recommendedEvidence,
    unknowns,
    limitations: uniqueList([
      'Ops checklist generation is planning only and does not execute operational checks.',
      'Required evidence describes what future verification must collect; it is not proof that a check passed.',
      'No MCP, shell command, network, database, config file, or log access was used.',
      ...constraints.map((constraint) => `Known constraint: ${constraint}`),
      ...knownRisks.map((risk) => `Known ops risk: ${risk}`),
    ]),
  };
}
