import { MemoryClient } from 'mem0ai'

// Initialize mem0 client
const mem0Client = new MemoryClient({
  apiKey: process.env.MEM0_API_KEY!,
})

export interface EmergencyMemory {
  sessionId: string
  userId?: string
  type: string
  severity: string
  summary: string
  location?: string
  conversationSummary: string
  steps: string[]
  escalatedAt: number
}

// Store emergency session memory
export async function storeEmergencyMemory(memory: EmergencyMemory) {
  try {
    const memoryContent = `
Emergency Session: ${memory.sessionId}
Type: ${memory.type}
Severity: ${memory.severity}
Summary: ${memory.summary}
Location: ${memory.location || 'Unknown'}
Conversation: ${memory.conversationSummary}
Steps Provided: ${memory.steps.join(', ')}
Escalated At: ${new Date(memory.escalatedAt).toISOString()}
    `.trim()

    const result = await mem0Client.add(
      [{ role: 'user', content: memoryContent }],
      {
        user_id: memory.userId || memory.sessionId,
        metadata: {
          type: 'emergency_session',
          sessionId: memory.sessionId,
          severity: memory.severity,
          emergencyType: memory.type,
        },
      }
    )

    return result
  } catch (error) {
    console.error('mem0 store error:', error)
    throw error
  }
}

// Search for relevant past emergencies
export async function searchEmergencyMemories(query: string, userId?: string) {
  try {
    const results = await mem0Client.search(query, {
      user_id: userId,
      limit: 5,
    })
    return results
  } catch (error) {
    console.error('mem0 search error:', error)
    return []
  }
}

// Get all memories for a user
export async function getUserEmergencyHistory(userId: string) {
  try {
    const memories = await mem0Client.getAll({
      user_id: userId,
    })
    return memories
  } catch (error) {
    console.error('mem0 getAll error:', error)
    return []
  }
}

export { mem0Client }
