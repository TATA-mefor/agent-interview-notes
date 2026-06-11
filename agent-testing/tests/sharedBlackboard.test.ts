import { describe, it, expect } from 'vitest';
import {
  createSharedBlackboard,
  writeBlackboardValue,
  appendBlackboardArrayValue,
  appendBlackboardUnknowns,
  appendBlackboardLimitations,
  summarizeSharedBlackboard,
} from '../src/agent-runtime/sharedBlackboard';

describe('SharedBlackboard', () => {
  it('createSharedBlackboard initializes sessionId and empty unknowns/limitations', () => {
    const bb = createSharedBlackboard('test-session');
    expect(bb.sessionId).toBe('test-session');
    expect(bb.unknowns).toEqual([]);
    expect(bb.limitations).toEqual([]);
  });

  it('writeBlackboardValue does not mutate original blackboard', () => {
    const bb = createSharedBlackboard('test-session');
    const result = writeBlackboardValue(bb, {
      taskType: 'build_context',
      key: 'context',
      value: { moduleMap: [] },
    });
    expect(result.blackboard.context).toEqual({ moduleMap: [] });
    expect(bb.context).toBeUndefined(); // original unchanged
  });

  it('appendBlackboardArrayValue appends to array', () => {
    let bb = createSharedBlackboard('test-session');
    const r1 = appendBlackboardArrayValue(bb, {
      taskType: 'build_context',
      key: 'unknowns',
      value: 'note 1',
    });
    bb = r1.blackboard;
    const r2 = appendBlackboardArrayValue(bb, {
      taskType: 'build_context',
      key: 'unknowns',
      value: 'note 2',
    });
    expect(r2.blackboard.unknowns).toEqual(['note 1', 'note 2']);
  });

  it('appendBlackboardUnknowns deduplicates', () => {
    let bb = createSharedBlackboard('test-session');
    bb = appendBlackboardUnknowns(bb, ['a', 'b']);
    bb = appendBlackboardUnknowns(bb, ['b', 'c']);
    const unknowns = bb.unknowns ?? [];
    expect(unknowns.filter((u: string) => u === 'b')).toHaveLength(1);
    expect(unknowns).toContain('a');
    expect(unknowns).toContain('c');
  });

  it('appendBlackboardLimitations deduplicates', () => {
    let bb = createSharedBlackboard('test-session');
    bb = appendBlackboardLimitations(bb, ['lim1']);
    bb = appendBlackboardLimitations(bb, ['lim1', 'lim2']);
    const lims = bb.limitations ?? [];
    expect(lims.filter((l: string) => l === 'lim1')).toHaveLength(1);
  });

  it('summarizeSharedBlackboard returns counts, not content', () => {
    let bb = createSharedBlackboard('test-session');
    bb = { ...bb, testCases: [{ id: 'tc-1' }, { id: 'tc-2' }] };
    const summary = summarizeSharedBlackboard(bb);
    expect(summary.sessionId).toBe('test-session');
    expect(summary.testCaseCount).toBe(2);
    expect(summary.rawEvidenceCount).toBe(0);
    // summary must be numbers, not objects
    expect(typeof summary.testCaseCount).toBe('number');
  });
});
