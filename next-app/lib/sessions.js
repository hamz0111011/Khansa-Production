/* ═══════════════════════════════════════════════════════════════
   LIB/SESSIONS.JS — Helper untuk sessions (shared)
═══════════════════════════════════════════════════════════════ */

export function getSessionStatus(session) {
  const now      = new Date()
  const deadline = new Date(session.deadline)
  if (session.submitted)                              return 'selesai'
  if (now > deadline)                                 return 'expired'
  if (session.selections && session.selections.length > 0) return 'memilih'
  return 'menunggu'
}

/** Normalisasi kolom snake_case Supabase → camelCase untuk client */
export function toClient(s) {
  return {
    id:             s.id,
    clientName:     s.client_name,
    driveLink:      s.drive_link,
    whatsapp:       s.whatsapp,
    maxPhotos:      s.max_photos,
    deadline:       s.deadline,
    selections:     s.selections || [],
    submitted:      s.submitted,
    submittedAt:    s.submitted_at,
    createdAt:      s.created_at,
    status:         getSessionStatus(s),
    photographerId: s.photographer_id,
  }
}
