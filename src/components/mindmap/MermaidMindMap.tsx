'use client'

import { useEffect, useRef, useState } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import type { MindMapTree } from '@/lib/services/mindMapService'

// Convert MindMapTree to Markdown for markmap
function treeToMarkdown(tree: MindMapTree): string {
  const lines: string[] = [`# ${tree.root}`]
  for (const cat of tree.categories) {
    lines.push(`## ${cat.label}`)
    for (const group of cat.groups) {
      lines.push(`### ${group.name}`)
      for (const card of group.cards) {
        const title = card.shortTitle
          .replace(/"/g, "'")
          .replace(/\(/g, '（').replace(/\)/g, '）')
          .replace(/\[/g, '【').replace(/\]/g, '】')
        lines.push(`#### [${card.icon} ${title}](/cards/${card.id})`)
      }
    }
  }
  return lines.join('\n')
}

export default function MarkmapMindMap({ tree }: { tree: MindMapTree | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const markmapRef = useRef<Markmap | null>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })
  const [error, setError] = useState<string | null>(null)

  // Measure container and set explicit SVG dimensions (d3-zoom requires pixel values)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setDims({ width, height: Math.max(height, 500) })
        }
      }
    })

    resizeObserver.observe(container)
    // Initial measurement
    const { width, height } = container.getBoundingClientRect()
    if (width > 0 && height > 0) {
      setDims({ width, height: Math.max(height, 500) })
    }

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (!tree || dims.width <= 0) return
    setError(null)

    try {
      const transformer = new Transformer()
      const markdown = treeToMarkdown(tree)
      const { root: data } = transformer.transform(markdown)

      const svg = svgRef.current
      if (!markmapRef.current && svg) {
        markmapRef.current = Markmap.create(svg, {
          autoFit: true,
          duration: 400,
          maxWidth: 280,
          paddingX: 16,
        })
      }

      if (markmapRef.current) {
        markmapRef.current.setData(data)
        markmapRef.current.fit()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Markmap 渲染失败')
    }
  }, [tree, dims])

  if (!tree) return null

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: 500 }}>
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      ) : (
        <svg
          ref={svgRef}
          width={dims.width}
          height={dims.height}
          className="rounded-lg"
        />
      )}
    </div>
  )
}
