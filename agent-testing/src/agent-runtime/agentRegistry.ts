import type {
  AgentRuntimeRole,
} from './agentRuntimeTypes';
import {
  DEFAULT_AGENT_PROFILES,
  type AgentProfile,
  validateAgentProfiles,
} from './agentProfileTypes';

export interface AgentRegistry {
  readonly profiles: readonly AgentProfile[];
  get(role: AgentRuntimeRole): AgentProfile | undefined;
  require(role: AgentRuntimeRole): AgentProfile;
  list(): readonly AgentProfile[];
  has(role: AgentRuntimeRole): boolean;
}

export function createAgentRegistry(
  profiles: readonly AgentProfile[]
): AgentRegistry {
  const validation = validateAgentProfiles(profiles);

  if (!validation.valid) {
    const issueSummary = validation.issues
      .map((issue) => `${issue.role}.${issue.field}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid Agent profiles: ${issueSummary}`);
  }

  const profileList = [...profiles];

  return {
    profiles: profileList,
    get(role) {
      return profileList.find((profile) => profile.role === role);
    },
    require(role) {
      const profile = profileList.find((item) => item.role === role);

      if (!profile) {
        throw new Error(`Agent profile is not registered for role: ${role}`);
      }

      return profile;
    },
    list() {
      return profileList;
    },
    has(role) {
      return profileList.some((profile) => profile.role === role);
    },
  };
}

export function createDefaultAgentRegistry(): AgentRegistry {
  return createAgentRegistry(DEFAULT_AGENT_PROFILES);
}
