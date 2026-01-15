"use client"

import { useState, useEffect } from "react"
import { getGraphData } from "@/actions/graph"
import { GraphView } from "@/components/GraphView"
import { useWorkspaceStore } from "@/store/useWorkspaceStore"
import { Loader2 } from "lucide-react"

export default function TagsPage() {
  const [data, setData] = useState<ReturnType<typeof getGraphData> extends Promise<infer T> ? T : never>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const { currentWorkspaceId } = useWorkspaceStore()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const result = await getGraphData(currentWorkspaceId || undefined)
        setData(result)
      } catch (error) {
        console.error("Failed to fetch graph data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentWorkspaceId])

  return (
    <div className="h-[calc(100vh)] w-full overflow-hidden bg-[#161616] flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b p-4">
        <h1 className="text-xl font-bold"># Tags</h1>
      </div>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <GraphView data={data} className="flex-1" />
      )}
    </div>
  )
}
