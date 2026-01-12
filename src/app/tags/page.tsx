
import { getGraphData } from "@/actions/graph"
import { GraphView } from "@/components/GraphView"

export default async function TagsPage() {
  const data = await getGraphData()

  return (
    <div className="h-[calc(100vh)] w-full overflow-hidden bg-[#161616] flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b p-4">
        <h1 className="text-xl font-bold"># Tags</h1>
      </div>
      <GraphView data={data} className="flex-1" />
    </div>
  )
}
