'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface NotesSectionProps {
  notes: Array<Record<string, unknown>>
  userId: string
  onUpdate: () => void
}

export function NotesSection({ notes, userId, onUpdate }: NotesSectionProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  async function addNote() {
    if (!content.trim()) return
    setSending(true)
    await fetch(`/api/admin/clients/${userId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
    setContent('')
    setSending(false)
    onUpdate()
  }

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
        <div className="flex gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add an internal note about this client..."
            rows={3}
            className="flex-1 bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) addNote()
            }}
          />
          <button
            onClick={addNote}
            disabled={sending || !content.trim()}
            className="self-end p-2.5 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-[var(--admin-text-dim)] mt-2">Cmd+Enter to send</p>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-[var(--admin-text-dim)] text-sm">
          No notes yet
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id as string}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4"
            >
              <p className="text-sm text-[var(--admin-text)] whitespace-pre-wrap">{note.content as string}</p>
              <p className="text-[10px] text-[var(--admin-text-dim)] mt-2">
                {new Date(note.created_at as string).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
