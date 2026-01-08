import {
  AICommand,
  CreateAICommandInput,
  UpdateAICommandInput,
  AICommandsResponse,
  AICommandResponse,
} from '@/types/api'

const API_BASE = '/api'

export const aiCommandsApi = {
  /**
   * Get all AI commands (built-in + user custom)
   */
  async getCommands(): Promise<AICommandsResponse> {
    const response = await fetch(`${API_BASE}/ai-commands`)
    return response.json()
  },

  /**
   * Create custom AI command
   */
  async createCommand(data: CreateAICommandInput): Promise<AICommandResponse> {
    const response = await fetch(`${API_BASE}/ai-commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  /**
   * Get AI command by ID
   */
  async getCommand(id: string): Promise<AICommandResponse> {
    const response = await fetch(`${API_BASE}/ai-commands/${id}`)
    return response.json()
  },

  /**
   * Update AI command
   */
  async updateCommand(
    id: string,
    data: UpdateAICommandInput
  ): Promise<AICommandResponse> {
    const response = await fetch(`${API_BASE}/ai-commands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  /**
   * Delete AI command
   */
  async deleteCommand(
    id: string
  ): Promise<{ success?: boolean; error?: string }> {
    const response = await fetch(`${API_BASE}/ai-commands/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },
}
