import { SearchParams, SearchResponse } from '@/types/api'

const API_BASE = '/api'

export const searchApi = {
  /**
   * Global search
   */
  async search(params: SearchParams & { saveHistory?: boolean }): Promise<SearchResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('q', params.q)
    if (params.page) searchParams.set('page', params.page.toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.saveHistory !== undefined) searchParams.set('saveHistory', params.saveHistory.toString())

    const response = await fetch(
      `${API_BASE}/search?${searchParams.toString()}`
    )
    return response.json()
  },

  /**
   * Get search history
   */
  async getHistory(): Promise<{ data: Array<{ id: string; query: string; createdAt: string }> }> {
    const response = await fetch(`${API_BASE}/search?history=true`)
    return response.json()
  },
}
