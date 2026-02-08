export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      incidents: {
        Row: {
          id: string
          type: 'medical' | 'fire' | 'safety' | 'accident' | 'other'
          summary: string
          description: string
          victims: number
          risks: string[]
          steps: string[]
          tactical_advice: string
          severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          status: 'active' | 'assigned' | 'en_route' | 'on_scene' | 'resolved'
          location_lat: number | null
          location_lng: number | null
          location_address: string | null
          dispatch_notes: string
          reported_by: string | null
          language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'medical' | 'fire' | 'safety' | 'accident' | 'other'
          summary: string
          description: string
          victims?: number
          risks?: string[]
          steps?: string[]
          tactical_advice?: string
          severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          status?: 'active' | 'assigned' | 'en_route' | 'on_scene' | 'resolved'
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          dispatch_notes?: string
          reported_by?: string | null
          language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'medical' | 'fire' | 'safety' | 'accident' | 'other'
          summary?: string
          description?: string
          victims?: number
          risks?: string[]
          steps?: string[]
          tactical_advice?: string
          severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          status?: 'active' | 'assigned' | 'en_route' | 'on_scene' | 'resolved'
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          dispatch_notes?: string
          reported_by?: string | null
          language?: string
          updated_at?: string
        }
        Relationships: []
      }
      responders: {
        Row: {
          id: string
          name: string
          role: 'medical' | 'police' | 'fire' | 'rescue'
          unit_id: string
          status: 'available' | 'busy' | 'offline'
          current_incident_id: string | null
          location_lat: number | null
          location_lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: 'medical' | 'police' | 'fire' | 'rescue'
          unit_id: string
          status?: 'available' | 'busy' | 'offline'
          current_incident_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          role?: 'medical' | 'police' | 'fire' | 'rescue'
          unit_id?: string
          status?: 'available' | 'busy' | 'offline'
          current_incident_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      incident_assignments: {
        Row: {
          id: string
          incident_id: string
          responder_id: string
          assigned_at: string
          status: 'assigned' | 'en_route' | 'on_scene' | 'completed'
        }
        Insert: {
          id?: string
          incident_id: string
          responder_id: string
          assigned_at?: string
          status?: 'assigned' | 'en_route' | 'on_scene' | 'completed'
        }
        Update: {
          status?: 'assigned' | 'en_route' | 'on_scene' | 'completed'
        }
        Relationships: []
      }
      escalated_sessions: {
        Row: {
          id: string
          type: string
          severity: string
          summary: string
          status: 'escalated' | 'assigned' | 'connected' | 'resolved'
          location_lat: number | null
          location_lng: number | null
          location_address: string | null
          messages: Json
          steps: Json
          assigned_responder: Json | null
          priority: number
          language: string
          image_snapshot: string | null
          escalated_at: string
          resolved_at: string | null
          qa_report: Json | null
          dispatch_notes: string
          spam_verdict: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          type?: string
          severity?: string
          summary?: string
          status?: 'escalated' | 'assigned' | 'connected' | 'resolved'
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          messages?: Json
          steps?: Json
          assigned_responder?: Json | null
          priority?: number
          language?: string
          image_snapshot?: string | null
          escalated_at?: string
          resolved_at?: string | null
          qa_report?: Json | null
          dispatch_notes?: string
          spam_verdict?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: string
          severity?: string
          summary?: string
          status?: 'escalated' | 'assigned' | 'connected' | 'resolved'
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          messages?: Json
          steps?: Json
          assigned_responder?: Json | null
          priority?: number
          language?: string
          image_snapshot?: string | null
          resolved_at?: string | null
          qa_report?: Json | null
          dispatch_notes?: string
          spam_verdict?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          id: string
          session_id: string
          sender_role: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          sender_role: string
          content: string
          created_at?: string
        }
        Update: {
          sender_role?: string
          content?: string
        }
        Relationships: []
      }
      spam_reports: {
        Row: {
          id: string
          ip_address: string
          session_id: string | null
          trust_score: number
          classification: 'genuine' | 'suspicious' | 'likely_spam' | 'confirmed_spam'
          reasons: string[]
          action_taken: 'allow' | 'flag_for_review' | 'require_verification' | 'block'
          endpoint: string
          reviewed: boolean
          reviewed_by: string | null
          review_outcome: 'confirmed_spam' | 'false_positive' | 'genuine' | null
          created_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          session_id?: string | null
          trust_score: number
          classification: 'genuine' | 'suspicious' | 'likely_spam' | 'confirmed_spam'
          reasons?: string[]
          action_taken: 'allow' | 'flag_for_review' | 'require_verification' | 'block'
          endpoint: string
          reviewed?: boolean
          reviewed_by?: string | null
          review_outcome?: 'confirmed_spam' | 'false_positive' | 'genuine' | null
          created_at?: string
        }
        Update: {
          reviewed?: boolean
          reviewed_by?: string | null
          review_outcome?: 'confirmed_spam' | 'false_positive' | 'genuine' | null
        }
        Relationships: []
      }
      community_alerts: {
        Row: {
          id: string
          incident_id: string | null
          alert_type: 'warning' | 'advisory' | 'all_clear' | 'evacuation' | 'shelter_in_place'
          title: string
          message: string
          severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          radius_km: number
          center_lat: number | null
          center_lng: number | null
          active: boolean
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          incident_id?: string | null
          alert_type: 'warning' | 'advisory' | 'all_clear' | 'evacuation' | 'shelter_in_place'
          title: string
          message: string
          severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          radius_km?: number
          center_lat?: number | null
          center_lng?: number | null
          active?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          alert_type?: 'warning' | 'advisory' | 'all_clear' | 'evacuation' | 'shelter_in_place'
          title?: string
          message?: string
          severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          radius_km?: number
          center_lat?: number | null
          center_lng?: number | null
          active?: boolean
          expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          id: string
          citizen_identifier: string
          contact_name: string
          contact_phone: string
          contact_email: string | null
          relationship: string
          auto_notify: boolean
          created_at: string
        }
        Insert: {
          id?: string
          citizen_identifier: string
          contact_name: string
          contact_phone: string
          contact_email?: string | null
          relationship: string
          auto_notify?: boolean
          created_at?: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          contact_email?: string | null
          relationship?: string
          auto_notify?: boolean
        }
        Relationships: []
      }
      incident_verifications: {
        Row: {
          id: string
          incident_id: string
          verifier_ip: string
          verification_type: 'confirm' | 'deny' | 'additional_info'
          details: string | null
          location_lat: number | null
          location_lng: number | null
          created_at: string
        }
        Insert: {
          id?: string
          incident_id: string
          verifier_ip: string
          verification_type: 'confirm' | 'deny' | 'additional_info'
          details?: string | null
          location_lat?: number | null
          location_lng?: number | null
          created_at?: string
        }
        Update: {
          verification_type?: 'confirm' | 'deny' | 'additional_info'
          details?: string | null
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          id: string
          citizen_identifier: string
          full_name: string
          date_of_birth: string | null
          blood_type: string | null
          allergies: string[]
          medications: string[]
          conditions: string[]
          emergency_notes: string
          organ_donor: boolean
          height_cm: number | null
          weight_kg: number | null
          primary_physician: string | null
          physician_phone: string | null
          insurance_info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          citizen_identifier: string
          full_name?: string
          date_of_birth?: string | null
          blood_type?: string | null
          allergies?: string[]
          medications?: string[]
          conditions?: string[]
          emergency_notes?: string
          organ_donor?: boolean
          height_cm?: number | null
          weight_kg?: number | null
          primary_physician?: string | null
          physician_phone?: string | null
          insurance_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          date_of_birth?: string | null
          blood_type?: string | null
          allergies?: string[]
          medications?: string[]
          conditions?: string[]
          emergency_notes?: string
          organ_donor?: boolean
          height_cm?: number | null
          weight_kg?: number | null
          primary_physician?: string | null
          physician_phone?: string | null
          insurance_info?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}

export type Incident = Database['public']['Tables']['incidents']['Row']
export type Responder = Database['public']['Tables']['responders']['Row']
export type IncidentAssignment = Database['public']['Tables']['incident_assignments']['Row']
