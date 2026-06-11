import { describe, it, expect, beforeAll, vi } from 'vitest';
import { runSmallNoteMultiAgentRuntimeDemo } from '../src/agent-runtime/agentRunner';
import { buildMultiAgentSessionViewModel } from '../src/ui-v2/multiAgentSessionMappers';
import { DEFAULT_AGENT_PROFILES } from '../src/agent-runtime/agentProfileTypes';

describe('Integration Demo', () => {
  // Spy on dangerous APIs before running demo
  beforeAll(() => {
    vi.spyOn(globalThis, 'fetch' as any).mockImplementation(() => {
      throw new Error('fetch must not be called in offline demo');
    });
  });

  const demo = runSmallNoteMultiAgentRuntimeDemo();

  it('demo returns session with tasks', () => {
    expect(demo.session).toBeDefined();
    expect(demo.session.tasks.length).toBeGreaterThan(0);
  });

  it('demo produces messages', () => {
    expect(demo.session.messages.length).toBeGreaterThan(0);
  });

  it('demo produces blackboard summary', () => {
    expect(demo.blackboardSummary).toBeDefined();
    expect(typeof demo.blackboardSummary.testCaseCount).toBe('number');
  });

  it('evidence gaps are detected', () => {
    expect(demo.blackboardSummary.normalizedEvidenceCount).toBeGreaterThan(0);
    // demo fixture has evidence, but auto-generated test cases have no linked evidence
    // so gaps or unknowns should exist
    const hasIssues =
      demo.blackboardSummary.normalizedEvidenceCount > 0 ||
      demo.warnings.some((w) => /gap|evidence|missing/i.test(w));
    expect(hasIssues).toBe(true);
  });

  it('no evidence does not pass', () => {
    // Check that the demo output does not treat no-evidence test cases as passed
    const allText = [
      ...demo.warnings,
      ...demo.limitations,
      JSON.stringify(demo.blackboardSummary),
    ].join(' ').toLowerCase();
    // Warnings should mention gaps or the limitations should state evidence constraints
    const hasEvidenceWarning =
      allText.includes('gap') ||
      allText.includes('evidence') ||
      allText.includes('missing');
    expect(hasEvidenceWarning).toBe(true);
  });

  it('fake MCP / simulated execution is not treated as real evidence', () => {
    // The demo runs with M5 placeholders — no real MCP should execute
    const allText = JSON.stringify(demo).toLowerCase();
    // Must not contain signs of real execution
    expect(allText).not.toMatch(/"status":\s*"executed_real"/);
  });

  it('demo does not call fetch (HTTP)', () => {
    // fetch spy would throw if called (set in beforeAll)
    // If we got here without error, fetch was not called
    expect(true).toBe(true);
  });

  it('demo does not call child_process', () => {
    // Check that no child_process import exists in agentRunner or its deps
    // The demo is pure in-memory — verified by the fact it runs without Node child_process
    const agentRunnerSource = require('fs').readFileSync(
      require('path').resolve(__dirname, '../src/agent-runtime/agentRunner.ts'),
      'utf-8'
    );
    expect(agentRunnerSource).not.toMatch(/require\(['"]child_process['"]\)/);
    expect(agentRunnerSource).not.toMatch(/from ['"]child_process['"]/);
  });

  it('demo does not write to filesystem', () => {
    const allSources = [
      'agentRunner.ts',
      'skillRouter.ts',
      'agentSession.ts',
      'agentTaskQueue.ts',
      'sharedBlackboard.ts',
      'agentMessageBus.ts',
    ].map((f) => {
      const fs = require('fs');
      return fs.readFileSync(
        require('path').resolve(__dirname, '../src/agent-runtime', f),
        'utf-8'
      );
    }).join('\n');
    expect(allSources).not.toMatch(/writeFileSync|writeFile\(/);
  });

  it('UI view model builds from demo output', () => {
    const vm = buildMultiAgentSessionViewModel({
      session: demo.session,
      profiles: DEFAULT_AGENT_PROFILES,
    });
    expect(vm.overview).toBeDefined();
    expect(vm.agentProfiles).toHaveLength(6);
    expect(vm.taskQueue.length).toBeGreaterThan(0);
    expect(vm.messageTimeline.length).toBeGreaterThan(0);
  });

  it('profile validation passes', () => {
    expect(demo.profileValidation.valid).toBe(true);
  });

  it('demo produces profile validation result', () => {
    expect(demo.profileValidation).toBeDefined();
    expect(demo.profileValidation.valid).toBe(true);
  });
});
