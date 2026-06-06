'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, Panel, MarkerType,
  Handle, Position,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Link from 'next/link'
import { getCategoryColor } from '@/lib/services/graphService'
import type { GraphCardNode, GraphEdge, GraphData } from '@/lib/services/graphService'

// ---- Edge Styles ----
const EDGE_DEFS: Record<string, { stroke: string; label: string; dashed?: boolean; arrow?: boolean; animate?: boolean }> = {
  prerequisite: { stroke: '#EF4444', label: '前置', arrow: true },
  follow_up:    { stroke: '#F59E0B', label: '追问', arrow: true, animate: true },
  compare:      { stroke: '#8B5CF6', label: '对比' },
  related:      { stroke: '#94A3B8', label: '相关', dashed: true },
  same_topic:   { stroke: '#10B981', label: '同主题', dashed: true },
}

// ---- Key Concept Extraction ----
function extractKeyConcept(question: string, tags: string[]): string {
  let m: RegExpMatchArray | null
  m = question.match(/什么是\s*(?:AI\s*)?(.+?)[？?]/); if (m) return m[1].trim().replace(/的(核心)?(概念|原理|作用|设计|机制).*$/, '')
  m = question.match(/(.+?)\s*是什么[？?]/); if (m) return m[1].trim()
  m = question.match(/如何(?:设计|实现|优化|处理|构建|选择|评估|管理)(.+?)[？?]/); if (m) return m[1].trim()
  m = question.match(/(.+?)(?:和|与|vs\.?)(.+?)(?:的|有)(?:区别|不同|对比)/)
  if (m) { const a = m[1].trim().slice(0, 8), b = m[2].trim().slice(0, 8); return `${a} vs ${b}` }
  if (tags?.length > 0) { const t = tags.find(x => x.length >= 2 && x.length <= 14); if (t) return t }
  const cleaned = question.replace(/^(?:如何|怎么|怎样|为什么|什么是|什么|哪些|哪个|什么时候)/, '').replace(/[？?]$/, '').trim()
  return cleaned.length > 16 ? cleaned.slice(0, 14) + '…' : cleaned
}

// ---- Custom Node Component (xyflow style) ----
function CardNode({ data }: NodeProps) {
  const d = data as { concept: string; category: string; difficulty: string; mastery: number; relatedCount: number; question: string }
  const color = getCategoryColor(d.category)
  const diffColor = d.difficulty === '高级' ? '#EF4444' : d.difficulty === '中级' ? '#F59E0B' : '#10B981'

  return (
    <div
      className="relative rounded-xl shadow-md border-2 bg-white cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderColor: color, minWidth: 150, maxWidth: 220, padding: '12px 14px' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />

      {/* Category badge */}
      <div className="absolute -top-2 left-3 px-2 py-0.5 rounded-full text-white font-medium"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: 9 }}>
        {d.category}
      </div>

      {/* Concept */}
      <div className="font-bold text-gray-800 mt-1 mb-2 leading-tight" style={{ fontSize: 14 }}>
        {d.concept}
      </div>

      {/* Difficulty dot + mastery bar */}
      <div className="flex items-center gap-2 mt-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: diffColor }} />
        <span className="text-gray-400" style={{ fontSize: 10 }}>{d.difficulty}</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{
              width: `${Math.round(d.mastery * 100)}%`,
              backgroundColor: d.mastery >= 0.7 ? '#10B981' : d.mastery >= 0.4 ? '#F59E0B' : '#EF4444',
            }} />
        </div>
        <span className="text-gray-400" style={{ fontSize: 10 }}>{Math.round(d.mastery * 100)}%</span>
      </div>

      {/* Related count */}
      {d.relatedCount > 0 && (
        <div className="text-gray-300 mt-1.5" style={{ fontSize: 9 }}>
          {d.relatedCount} 条关联
        </div>
      )}
    </div>
  )
}

const nodeTypes = { cardNode: CardNode }

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphCardNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [relationFilter, setRelationFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [centerCardId] = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('centerCardId') || '' : '')

  const fetchGraph = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      if (relationFilter) params.set('relationType', relationFilter)
      if (difficultyFilter) params.set('difficulty', difficultyFilter)
      if (centerCardId) { params.set('centerCardId', centerCardId); params.set('depth', '1') }
      const res = await fetch(`/api/graph?${params}`)
      const { data } = await res.json()
      setGraphData(data)
    } catch { } finally { setLoading(false) }
  }, [categoryFilter, relationFilter, difficultyFilter, centerCardId])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graphData) return { flowNodes: [], flowEdges: [] }
    const nodeMap = new Map(graphData.nodes.map((n) => [n.id, n] as const))

    // Layout: compact grid by category
    const byCategory: Record<string, GraphCardNode[]> = {}
    const catOrder = ['基础概念', '核心模块', '工作模式', '架构设计', '工程实践', '评估与多Agent']
    graphData.nodes.forEach(n => { (byCategory[n.category] ??= []).push(n) })

    const fn: Node[] = []
    const colWidth = 200
    const rowHeight = 120
    const startX = 20
    const startY = 20
    const maxPerCol = 16

    catOrder.forEach((cat, ci) => {
      const catNodes = byCategory[cat] || []
      if (catNodes.length === 0) return

      const x = startX + ci * colWidth
      // Spread across 2 sub-columns if category has many nodes
      const half = Math.ceil(catNodes.length / 2)
      catNodes.forEach((n, ni) => {
        const subCol = ni < half ? 0 : 1
        const row = ni < half ? ni : ni - half
        fn.push({
          id: n.id,
          position: {
            x: x + subCol * (colWidth / 2),
            y: startY + row * rowHeight,
          },
          data: {
            concept: extractKeyConcept(n.question, n.tags),
            category: n.category, difficulty: n.difficulty,
            mastery: n.mastery, relatedCount: n.relatedCount,
            question: n.question,
          },
          type: 'cardNode',
        })
      })
    })

    const fe: Edge[] = graphData.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => {
        const def = EDGE_DEFS[e.relationType] || EDGE_DEFS.related
        return {
          id: e.id, source: e.source, target: e.target,
          type: 'smoothstep',
          label: def.label,
          style: { stroke: def.stroke, strokeWidth: e.score > 0.8 ? 2.5 : 1.5, strokeDasharray: def.dashed ? '6 4' : undefined },
          markerEnd: def.arrow ? { type: MarkerType.ArrowClosed as const, color: def.stroke, width: 18, height: 18 } : undefined,
          animated: def.animate,
          labelStyle: { fill: def.stroke, fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: '#fff', fillOpacity: 0.95 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
          data: e as unknown as Record<string, unknown>,
        }
      })

    return { flowNodes: fn, flowEdges: fe }
  }, [graphData])

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => { setNodes(flowNodes); setEdges(flowEdges) }, [flowNodes, flowEdges, setNodes, setEdges])

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    const gNode = graphData?.nodes.find((n) => n.id === node.id)
    if (gNode) { setSelectedNode(gNode); setSelectedEdge(null) }
  }, [graphData])

  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.data as unknown as GraphEdge); setSelectedNode(null)
  }, [])

  const stats = graphData?.stats
  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载图谱...</div>

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)]">
      {/* Filter Panel */}
      <div className={`bg-white border-r border-gray-200 overflow-y-auto shrink-0 ${filterOpen ? 'block' : 'hidden'} lg:block`} style={{ width: 200 }}>
        <div className="p-3">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">筛选</h3>
          <div className="mb-3">
            <label className="text-xs text-gray-500">模块</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full mt-1 px-2 py-1 border border-gray-200 rounded text-xs">
              <option value="">全部</option>
              {stats?.categoryCounts && Object.entries(stats.categoryCounts).map(([c, n]) => (
                <option key={c} value={c}>{c} ({n})</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="text-xs text-gray-500">关系类型</label>
            <select value={relationFilter} onChange={(e) => setRelationFilter(e.target.value)}
              className="w-full mt-1 px-2 py-1 border border-gray-200 rounded text-xs">
              <option value="">全部</option>
              {Object.entries(EDGE_DEFS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
          </div>
          <div className="mb-3">
            <label className="text-xs text-gray-500">难度</label>
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full mt-1 px-2 py-1 border border-gray-200 rounded text-xs">
              <option value="">全部</option><option value="初级">初级</option><option value="中级">中级</option><option value="高级">高级</option>
            </select>
          </div>
          {stats && (
            <div className="border-t border-gray-100 pt-3 mt-3 text-xs text-gray-500 space-y-1">
              <div>节点: {stats.nodeCount}</div><div>边: {stats.edgeCount}</div>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">图例</div>
            {Object.entries(EDGE_DEFS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <svg width="28" height="12"><line x1="0" y1="6" x2="26" y2="6" stroke={v.stroke} strokeWidth="2"
                  strokeDasharray={v.dashed ? '4 3' : undefined} />
                  {v.arrow && <polygon points="26,6 18,2 18,10" fill={v.stroke} />}</svg>
                <span>{v.label}</span>
                {v.animate && <span className="text-gray-300 text-xs">·动画</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative flex flex-col">
        {/* Category bar */}
        {stats && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-gray-100 text-xs shrink-0">
            {Object.entries(stats.categoryCounts || {}).map(([cat, n]) => (
              <button type="button" key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                className={`px-2 py-0.5 rounded-full transition-colors ${categoryFilter === cat ? 'text-white font-medium' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                style={categoryFilter === cat ? { backgroundColor: getCategoryColor(cat) } : {}}>
                {cat} {n}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 relative">
          {/* Neighborhood mode indicator */}
          {centerCardId && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 shadow-sm">
              邻域视图 · 深度 1
            </div>
          )}
          <button type="button" onClick={() => setFilterOpen(!filterOpen)}
            className="lg:hidden absolute top-2 left-2 z-10 px-2 py-1 bg-white border border-gray-200 rounded text-xs shadow-sm">
            {filterOpen ? '关闭' : '筛选'}
          </button>
          {graphData && graphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">无匹配节点</div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick} onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes} fitView
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background color="#e2e8f0" gap={24} size={1} />
            <Controls className="!border !border-gray-200 !rounded-lg !shadow-sm" />
            <MiniMap
              nodeColor={(node) => getCategoryColor((node.data as { category: string })?.category || '')}
              maskColor="rgba(0,0,0,0.05)"
              style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}
            />
            {centerCardId && (
              <Panel position="top-left">
                <a href="/graph"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs shadow-sm hover:bg-gray-50 font-medium text-gray-700 no-underline">
                  ← 返回全局图谱
                </a>
              </Panel>
            )}
            {(categoryFilter || relationFilter || difficultyFilter) && !centerCardId && (
              <Panel position="top-center">
                <a href="/graph"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs shadow-sm hover:bg-blue-700 font-medium no-underline">
                  ← 返回全视图 ({stats?.nodeCount || 0} 节点)
                </a>
              </Panel>
            )}
            <Panel position="top-right">
              <button type="button" onClick={fetchGraph}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs shadow-sm hover:bg-gray-50 font-medium">
                🔄 刷新
              </button>
            </Panel>
          </ReactFlow>
        )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="bg-white border-l border-gray-200 overflow-y-auto shrink-0 p-4" style={{ width: 280 }}>
        {selectedNode ? <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
          : selectedEdge ? <EdgeDetail edge={selectedEdge} onClose={() => setSelectedEdge(null)} />
            : <div className="text-center text-gray-400 text-xs py-12"><div className="text-3xl mb-3">🔗</div><p>点击节点查看详情</p><p className="mt-1">点击边查看关系</p></div>}
      </div>
    </div>
  )
}

function NodeDetail({ node, onClose }: { node: GraphCardNode; onClose: () => void }) {
  const color = getCategoryColor(node.category)
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">节点详情</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="rounded-lg p-3 text-sm font-bold text-white mb-3 text-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
        {extractKeyConcept(node.question, node.tags)}
      </div>
      <div className="text-xs text-gray-700 leading-relaxed mb-3">{node.question}</div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: color, fontSize: 10 }}>{node.category}</span>
          <span className="text-gray-500">{node.difficulty} · {node.frequency}</span>
        </div>
        <div className="flex gap-3 text-gray-500"><span>掌握度 {Math.round(node.mastery * 100)}%</span><span>优先级 {node.reviewPriority.toFixed(2)}</span></div>
        <div className="text-gray-500">关联: {node.relatedCount} 条</div>
        {node.tags.length > 0 && <div className="flex flex-wrap gap-1">{node.tags.map(t => <span key={t} className="px-1 py-0 bg-gray-100 text-gray-500 rounded" style={{ fontSize: 10 }}>{t}</span>)}</div>}
        <div className="pt-2 space-y-1.5">
          <Link href={`/cards/${node.id}`} className="block text-center px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">查看完整详情 →</Link>
          <Link href={`/graph?centerCardId=${node.id}&depth=1`} className="block text-center px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">该题邻域图谱</Link>
        </div>
      </div>
    </div>
  )
}

function EdgeDetail({ edge, onClose }: { edge: GraphEdge; onClose: () => void }) {
  const def = EDGE_DEFS[edge.relationType] || EDGE_DEFS.related
  return (
    <div>
      <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-800">关系详情</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button></div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ backgroundColor: def.stroke }} /><span className="text-gray-700 font-medium">{def.label}</span><span className="text-gray-400">({edge.relationType})</span></div>
        {edge.reason && <div className="bg-gray-50 rounded-lg p-2 text-gray-600 leading-relaxed">{edge.reason}</div>}
        <div className="flex items-center gap-2 text-gray-400"><span>置信度 {(edge.score * 100).toFixed(0)}%</span><span>·</span><span>{edge.sourceType}</span></div>
      </div>
    </div>
  )
}
