import { describe, it, expect, vi } from 'vitest';

// ── Side-effect guards: set up before any imports ──

// stubGlobal hoists: blocks global fetch before anything runs
vi.stubGlobal('fetch', vi.fn(() => {
  throw new Error('globalThis.fetch must not be called in offline demo');
}));

// vi.mock hoists: any require/import of child_process gets throwing stubs
vi.mock('child_process', () => ({
  exec: vi.fn(() => { throw new Error('child_process.exec must not be called in offline demo'); }),
  execFile: vi.fn(() => { throw new Error('child_process.execFile must not be called in offline demo'); }),
  spawn: vi.fn(() => { throw new Error('child_process.spawn must not be called in offline demo'); }),
}));

// ── Imports after guards ──
import { runSmallNoteMultiAgentRuntimeDemo } from '../src/agent-runtime/agentRunner';
import { buildMultiAgentSessionViewModel } from '../src/ui-v2/multiAgentSessionMappers';
import { DEFAULT_AGENT_PROFILES } from '../src/agent-runtime/agentProfileTypes';
import * as fs from 'fs';
import * as path from 'path';

describe('Integration Demo', () => {
  const demo = runSmallNoteMultiAgentRuntimeDemo();

  // ── Core behaviour ──

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
    const hasIssues =
      demo.blackboardSummary.normalizedEvidenceCount > 0 ||
      demo.warnings.some((w) => /gap|evidence|missing/i.test(w));
    expect(hasIssues).toBe(true);
  });

  it('no evidence does not pass', () => {
    const allText = [
      ...demo.warnings,
      ...demo.limitations,
      JSON.stringify(demo.blackboardSummary),
    ].join(' ').toLowerCase();
    const hasEvidenceWarning =
      allText.includes('gap') ||
      allText.includes('evidence') ||
      allText.includes('missing');
    expect(hasEvidenceWarning).toBe(true);
  });

  it('fake MCP / simulated execution is not treated as real evidence', () => {
    const allText = JSON.stringify(demo).toLowerCase();
    expect(allText).not.toMatch(/"status":\s*"executed_real"/);
  });

  // ── Side-effect verification ──

  it('demo does not call fetch (HTTP)', () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('demo does not call child_process.exec / execFile / spawn', async () => {
    const cp = await import('child_process');
    expect(cp.exec).not.toHaveBeenCalled();
    expect(cp.execFile).not.toHaveBeenCalled();
    expect(cp.spawn).not.toHaveBeenCalled();
  });

  it('demo runtime sources contain no fs write API usage', () => {
    const runtimeDir = path.resolve(__dirname, '../src/agent-runtime');
    const sources = [
      'agentRunner.ts', 'skillRouter.ts', 'agentSession.ts',
      'agentTaskQueue.ts', 'sharedBlackboard.ts', 'agentMessageBus.ts',
    ].map((f) => fs.readFileSync(path.join(runtimeDir, f), 'utf-8'));
    const code = sources.join('\n');

    // V2 runtime is pure in-memory: must not write to filesystem
    const forbidden = ['writeFileSync', 'writeFile(', 'appendFileSync', 'appendFile(',
      'createWriteStream', 'fs.writeFile', 'fs.appendFile', 'fs.createWriteStream'];
    for (const api of forbidden) {
      expect(code).not.toContain(api);
    }
  });

  it('demo runtime sources contain no child_process import', () => {
    const runtimeDir = path.resolve(__dirname, '../src/agent-runtime');
    const sources = [
      'agentRunner.ts', 'skillRouter.ts', 'agentSession.ts',
      'agentTaskQueue.ts', 'sharedBlackboard.ts', 'agentMessageBus.ts',
      'approvalBridge.ts', 'mcpActionRouter.ts', 'typedInputBuilder.ts',
      'evidenceCollector.ts',
    ].map((f) => fs.readFileSync(path.join(runtimeDir, f), 'utf-8'));
    const code = sources.join('\n');

    // V2 runtime must not import child_process
    expect(code).not.toMatch(/require\(['"]child_process['"]\)/);
    expect(code).not.toMatch(/from ['"]child_process['"]/);
  });

  // ── UI view model ──

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
    expect(demo.profileValidation).toBeDefined();
    expect(demo.profileValidation.valid).toBe(true);
  });

  it('profile validation result structure', () => {
    expect(demo.profileValidation.valid).toBe(true);
  });
});
