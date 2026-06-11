import { describe, it, expect } from 'vitest';
import { createDefaultAgentRegistry, createAgentRegistry } from '../src/agent-runtime/agentRegistry';
import { DEFAULT_AGENT_PROFILES, TEST_LEAD_AGENT_PROFILE } from '../src/agent-runtime/agentProfileTypes';
import type { AgentProfile } from '../src/agent-runtime/agentProfileTypes';

describe('AgentRegistry', () => {
  it('createDefaultAgentRegistry returns 6 profiles', () => {
    const registry = createDefaultAgentRegistry();
    expect(registry.list()).toHaveLength(6);
  });

  it('require("test_lead") returns Test Lead profile', () => {
    const registry = createDefaultAgentRegistry();
    const profile = registry.require('test_lead');
    expect(profile.role).toBe('test_lead');
    expect(profile.displayName).toBe('Test Lead Agent');
  });

  it('get("test_lead") returns profile', () => {
    const registry = createDefaultAgentRegistry();
    const profile = registry.get('test_lead');
    expect(profile).toBeDefined();
    expect(profile!.role).toBe('test_lead');
  });

  it('get non-existent role returns undefined', () => {
    const registry = createDefaultAgentRegistry();
    expect(registry.get('nonexistent' as any)).toBeUndefined();
  });

  it('require non-existent role throws', () => {
    const registry = createDefaultAgentRegistry();
    expect(() => registry.require('nonexistent' as any)).toThrow();
  });

  it('has("ops_check") returns true', () => {
    const registry = createDefaultAgentRegistry();
    expect(registry.has('ops_check')).toBe(true);
  });

  it('has non-existent role returns false', () => {
    const registry = createDefaultAgentRegistry();
    expect(registry.has('nonexistent' as any)).toBe(false);
  });

  it('duplicate profile is rejected', () => {
    const duplicate: AgentProfile[] = [
      { ...TEST_LEAD_AGENT_PROFILE },
      { ...TEST_LEAD_AGENT_PROFILE },
    ];
    expect(() => createAgentRegistry(duplicate)).toThrow();
  });

  it('all profiles in default registry are valid', () => {
    const registry = createDefaultAgentRegistry();
    for (const profile of registry.list()) {
      expect(profile.role).toBeTruthy();
      expect(profile.allowedTaskTypes.length).toBeGreaterThan(0);
      expect(profile.allowedSkills.length).toBeGreaterThan(0);
      expect(profile.systemPrompt.trim().length).toBeGreaterThan(0);
    }
  });
});
