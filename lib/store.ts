import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Incident {
  id: string
  type: 'medical' | 'fire' | 'safety' | 'accident' | 'other'
  summary: string
  description: string
  victims: number
  risks: string[]
  steps: string[]
  tacticalAdvice: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'active' | 'assigned' | 'resolved'
  location?: {
    lat: number
    lng: number
    address?: string
  }
  timestamp: number
  respondersAssigned: string[]
}

export interface AIAnalysis {
  incidentType: 'medical' | 'fire' | 'safety' | 'accident' | 'other'
  summary: string
  victims: number
  risks: string[]
  steps: string[]
  tacticalAdvice: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
}

interface IncidentStore {
  incidents: Incident[]
  currentAnalysis: AIAnalysis | null
  currentDescription: string
  
  // Actions
  setCurrentAnalysis: (analysis: AIAnalysis | null) => void
  setCurrentDescription: (description: string) => void
  addIncident: (incident: Omit<Incident, 'id' | 'timestamp' | 'status' | 'respondersAssigned'>) => Incident
  updateIncident: (id: string, updates: Partial<Incident>) => void
  getIncident: (id: string) => Incident | undefined
  assignResponder: (incidentId: string, responderId: string) => void
  resolveIncident: (id: string) => void
  clearCurrentAnalysis: () => void
}

export const useIncidentStore = create<IncidentStore>()(
  persist(
    (set, get) => ({
      incidents: [],
      currentAnalysis: null,
      currentDescription: '',

      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      
      setCurrentDescription: (description) => set({ currentDescription: description }),

      addIncident: (incidentData) => {
        const newIncident: Incident = {
          ...incidentData,
          id: `INC-${Date.now()}`,
          timestamp: Date.now(),
          status: 'active',
          respondersAssigned: [],
        }
        set((state) => ({
          incidents: [newIncident, ...state.incidents],
        }))
        return newIncident
      },

      updateIncident: (id, updates) => {
        set((state) => ({
          incidents: state.incidents.map((inc) =>
            inc.id === id ? { ...inc, ...updates } : inc
          ),
        }))
      },

      getIncident: (id) => {
        return get().incidents.find((inc) => inc.id === id)
      },

      assignResponder: (incidentId, responderId) => {
        set((state) => ({
          incidents: state.incidents.map((inc) =>
            inc.id === incidentId
              ? {
                  ...inc,
                  status: 'assigned',
                  respondersAssigned: [...inc.respondersAssigned, responderId],
                }
              : inc
          ),
        }))
      },

      resolveIncident: (id) => {
        set((state) => ({
          incidents: state.incidents.map((inc) =>
            inc.id === id ? { ...inc, status: 'resolved' } : inc
          ),
        }))
      },

      clearCurrentAnalysis: () => set({ currentAnalysis: null, currentDescription: '' }),
    }),
    {
      name: 'rakshak-incidents',
    }
  )
)
