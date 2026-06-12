import { describe, it, expect, vi } from 'vitest';

// ── Side-effect guards: mocks hoisted before any imports ──

// Mock child_process: any require/import returns throwing stubs
vi.mock('child_process', () => ({
  exec: vi.fn(() => { throw new Error('child_process.exec must not be called in offline demo'); }),
  execFile: vi.fn(() => { throw new Error('child_process.execFile must not be called in offline demo'); }),
  spawn: vi.fn(() => { throw new Error('child_process.spawn must not be called in offline demo'); }),
  execSync: vi.fn(() => { throw new Error('child_process.execSync must not be called in offline demo'); }),
}));

// Mock fs write APIs: any require/import returns throwing stubs for write methods
vi.mock('fs', () => {
  const actual = vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    writeFileSync: vi.fn(() => { throw new Error('fs.writeFileSync must not be called in offline demo'); }),
    writeFile: vi.fn((_p, _d, cb: any) => { cb?.(new Error('fs.writeFile must not be called in offline demo')); }),
    appendFileSync: vi.fn(() => { throw new Error('fs.appendFileSync must not be called in offline demo'); }),
    appendFile: vi.fn((_p, _d, cb: any) => { cb?.(new Error('fs.appendFile must not be called in offline demo')); }),
  };
});

// Stub global fetch before any module that might access it
vi.stubGlobal('fetch', vi.fn(() => {
  throw new Error('globalThis.fetch must not be called in offline demo');
}));

// ── Imports after guards ──
import { runSmallNoteMultiAgentRuntimeDemo } from '../src/agent-runtime/agentRunner';
import { buildMultiAgentSessionViewModel } from '../src/ui-v2/multiAgentSessionMappers';
import { DEFAULT_AGENT_PROFILES } from '../src/agent-runtime/agentProfileTypes';

describe('Integration Demo', () => {
  // Run demo AFTER mocks are in place (top-level describe runs after all imports resolve)
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

  it('demo does not call fetch (HTTP)', () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('demo does not call child_process.exec / execFile / spawn', async () => {
    const cp = await import('child_process');
    const execMock = (cp.exec as ReturnType<typeof vi.fn>);
    const execFileMock = (cp.execFile as ReturnType<typeof vi.fn>);
    const spawnMock = (cp.spawn as ReturnType<typeof vi.fn>);
    expect(execMock).not.toHaveBeenCalled();
    expect(execFileMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('demo does not call fs writeFileSync / writeFile / appendFileSync / appendFile', async () => {
    const fs = await import('fs');
    const writeFileSyncMock = (fs.writeFileSync as ReturnType<typeof vi.fn>);
    const writeFileMock = (fs.writeFile as ReturnType<typeof vi.fn>);
    const appendFileSyncMock = (fs.appendFileSync as ReturnType<typeof vi.fn>);
    const appendFileMock = (fs.appendFile as ReturnType<typeof vi.fn>);
    expect(writeFileSyncMock).not.toHaveBeenCalled();
    // writeFile / appendFile are callback-based — CB error would bubble; mock itself should be clean
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(appendFileSyncMock).not.toHaveBeenCalled();
    expect(appendFileMock).not.toHaveBeenCalled();
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
    expect(demo.profileValidation).toBeDefined();
    expect(demo.profileValidation.valid).toBe(true);
  });

  it('demo produces profile validation result', () => {
    expect(demo.profileValidation).toBeDefined();
    expect(demo.profileValidation.valid).toBe(true);
  });
});
