import type {
  EvidenceResult,
  MarkdownString,
} from '../types';
import type {
  RawEvidenceInput,
} from '../evidence';
import type {
  McpToolResult,
} from './mcpToolResult';

function rawResultForMcpResult(result: McpToolResult): EvidenceResult {
  if (result.status === 'failed' && result.failureKind === 'system_under_test_failure') {
    return 'fail';
  }

  if (
    result.status === 'not_executed' ||
    result.status === 'blocked_by_approval' ||
    result.status === 'forbidden'
  ) {
    return 'not_run';
  }

  return 'inconclusive';
}

function recommendationForResult(result: McpToolResult): MarkdownString {
  if (result.failureKind === 'system_under_test_failure') {
    return 'Treat this as a system-under-test failure candidate only after normalization and severity classification.';
  }

  if (result.status === 'success') {
    return 'Review the MCP output scope before treating it as execution evidence; success does not automatically prove a system test passed.';
  }

  if (result.status === 'blocked_by_approval' || result.status === 'forbidden') {
    return 'Resolve approval or policy state before future MCP execution.';
  }

  return 'Classify the tool outcome separately from system-under-test behavior.';
}

export function mapMcpResultToRawEvidenceDraft(
  result: McpToolResult
): RawEvidenceInput {
  return {
    id: result.producedEvidenceIds[0] ?? `EV-MCP-${result.requestId}`.toUpperCase(),
    testScope: result.adapterKind,
    executionMethod: `MCP ${result.adapterKind} adapter tool ${result.toolName}`,
    executorType: 'mcp_tool',
    rawResult: rawResultForMcpResult(result),
    evidenceSource: result.rawEvidenceRef ?? `${result.serverName}:${result.toolName}`,
    evidenceSummary: result.outputSummary,
    observedAt: result.completedAt,
    environment: {
      name: 'unknown',
      notes: 'MCP result draft did not include a concrete execution environment contract.',
    },
    severity: result.failureKind === 'system_under_test_failure' ? 'unknown' : 'none',
    recommendation: recommendationForResult(result),
    confidence: result.status === 'success' && result.rawEvidenceRef ? 'medium' : 'low',
    limitations: [
      ...result.limitations,
      'Raw evidence draft was derived from an MCP result contract only.',
      'MCP tool success is mapped conservatively and does not automatically become pass evidence.',
      'Tool, approval, environment, and permission failures are not treated as system-under-test failures.',
    ],
    metadata: {
      toolName: result.toolName,
      rawEvidenceRef: result.rawEvidenceRef,
      mcpRequestId: result.requestId,
      mcpResultStatus: result.status,
      mcpFailureKind: result.failureKind,
    },
  };
}
