'use client'

import { useState, useEffect } from 'react'
import {
  Users, Plus, Trash2, Phone, Mail, Heart,
  Shield, CheckCircle2, Loader2, X, Edit2, Save
} from 'lucide-react'

interface Contact {
  id?: string
  name: string
  phone: string
  email: string
  relationship: string
  autoNotify: boolean
}

interface EmergencyContactsProps {
  citizenId: string
  compact?: boolean
}

export function EmergencyContacts({ citizenId, compact = false }: EmergencyContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newContact, setNewContact] = useState<Contact>({
    name: '', phone: '', email: '', relationship: 'family', autoNotify: true
  })

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`/api/emergency-contacts?citizenId=${citizenId}`)
        const data = await res.json()
        setContacts((data.contacts || []).map((c: any) => ({
          id: c.id,
          name: c.contact_name,
          phone: c.contact_phone,
          email: c.contact_email || '',
          relationship: c.relationship,
          autoNotify: c.auto_notify,
        })))
      } catch (err) {
        console.error('Failed to fetch contacts:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchContacts()
  }, [citizenId])

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) return
    setContacts(prev => [...prev, { ...newContact }])
    setNewContact({ name: '', phone: '', email: '', relationship: 'family', autoNotify: true })
  }

  const handleRemoveContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/emergency-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId,
          contacts: contacts.map(c => ({
            name: c.name,
            phone: c.phone,
            email: c.email,
            relationship: c.relationship,
            autoNotify: c.autoNotify,
          })),
        }),
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save contacts:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
      </div>
    )
  }

  // Compact view: just shows badge + count
  if (compact && !isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition text-slate-600"
      >
        <Users className="w-3.5 h-3.5" />
        {contacts.length > 0 ? `${contacts.length} contacts` : 'Add emergency contacts'}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-800">Emergency Contacts</h3>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition"
          >
            {isEditing ? <X className="w-3.5 h-3.5 text-slate-400" /> : <Edit2 className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {contacts.length === 0 && !isEditing ? (
          <div className="text-center py-4">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No emergency contacts set up</p>
            <p className="text-[10px] text-slate-400 mt-1">
              Add contacts to auto-notify when you report an emergency
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-3 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              <Plus className="w-3 h-3 inline mr-1" />
              Add Contact
            </button>
          </div>
        ) : (
          <>
            {contacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{contact.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Phone className="w-2.5 h-2.5" />
                      {contact.phone}
                      <span className="px-1 py-px bg-slate-200 rounded text-slate-500">{contact.relationship}</span>
                      {contact.autoNotify && (
                        <span className="text-green-500 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Auto-notify
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleRemoveContact(index)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {isEditing && contacts.length < 5 && (
          <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Add Contact</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newContact.name}
                onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-300"
              />
              <input
                value={newContact.phone}
                onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-300"
              />
              <input
                value={newContact.email}
                onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email (optional)"
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-300"
              />
              <select
                value={newContact.relationship}
                onChange={e => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-300"
              >
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="neighbor">Neighbor</option>
                <option value="spouse">Spouse</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={newContact.autoNotify}
                  onChange={e => setNewContact(prev => ({ ...prev, autoNotify: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Auto-notify in emergencies
              </label>
              <button
                onClick={handleAddContact}
                disabled={!newContact.name || !newContact.phone}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        )}

        {!isEditing && contacts.length > 0 && (
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            These contacts will be automatically notified when you escalate an emergency.
          </div>
        )}
      </div>
    </div>
  )
}
