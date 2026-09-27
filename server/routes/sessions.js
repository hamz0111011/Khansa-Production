/* ═══════════════════════════════════════════════════════════════
   ROUTES/SESSIONS.JS — CRUD Sesi Foto Klien (Supabase)
════════════════════════════════════════════════════════════════ */

const express   = require('express');
const supabase  = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router    = express.Router();

// ── Helpers ───────────────────────────────────────────────────
function getSessionStatus(session) {
  const now      = new Date();
  const deadline = new Date(session.deadline);
  if (session.submitted)                         return 'selesai';
  if (now > deadline)                            return 'expired';
  if (session.selections && session.selections.length > 0) return 'memilih';
  return 'menunggu';
}

/** Normalisasi kolom snake_case Supabase → camelCase untuk client */
function toClient(s) {
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
  };
}

// ── GET /api/sessions — List sesi milik fotografer yg login ──────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('photographer_id', req.user.uid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) {
    console.error('[GET /sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sessions — Buat sesi baru (set photographer_id) ────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { clientName, driveLink, whatsapp, deadline } = req.body;

    if (!clientName || !driveLink || !whatsapp || !deadline) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // Normalisasi nomor WA
    let waNumber = whatsapp.replace(/\D/g, '');
    if (waNumber.startsWith('0'))  waNumber = '62' + waNumber.slice(1);
    if (!waNumber.startsWith('62')) waNumber = '62' + waNumber;

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        client_name:      clientName,
        drive_link:       driveLink,
        whatsapp:         waNumber,
        max_photos:       99999,
        deadline,
        selections:       [],
        submitted:        false,
        photographer_id:  req.user.uid,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(toClient(data));
  } catch (err) {
    console.error('[POST /sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sessions/:id — Detail sesi (PUBLIC untuk klien) ────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Sesi tidak ditemukan' });
      throw error;
    }

    res.json(toClient(data));
  } catch (err) {
    console.error('[GET /sessions/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sessions/:id/submit — Konfirmasi pilihan (PUBLIC) ──
router.post('/:id/submit', async (req, res) => {
  try {
    const { selections } = req.body;

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ error: 'Sesi tidak ditemukan' });
      throw fetchErr;
    }

    if (new Date() > new Date(session.deadline)) {
      return res.status(403).json({ error: 'Batas waktu sudah habis' });
    }
    if (session.submitted) {
      return res.status(403).json({ error: 'Sudah dikonfirmasi sebelumnya' });
    }
    if (!selections || selections.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal 1 foto' });
    }

    const submittedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('sessions')
      .update({
        selections,
        submitted:    true,
        submitted_at: submittedAt,
      })
      .eq('id', req.params.id);

    if (updateErr) throw updateErr;

    const adminWa = process.env.ADMIN_WHATSAPP;
    let waUrl = null;

    if (adminWa && adminWa !== '628xxxxxxxxxx') {
      const deadlineStr = new Date(session.deadline).toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const submittedStr = new Date(submittedAt).toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const lines = [
        `📸 *KONFIRMASI PILIHAN FOTO*`,
        ``,
        `Klien   : *${session.client_name}*`,
        `Total   : *${selections.length} foto*`,
        `Dikirim : ${submittedStr}`,
        ``,
        `📋 *Daftar Foto yang Dipilih:*`,
        ...selections.map((s, i) => {
          const raw = s.name || s.id
          const numOnly = raw
            .replace(/\.[^.]+$/, '')
            .replace(/^[A-Za-z_-]+/, '')
            .trim() || raw
          return `  ${i + 1}. ${numOnly}`
        }),
        ``,
        `📁 Folder Drive:`,
        session.drive_link,
        ``,
        `_Pesan ini dikirim otomatis dari sistem._`,
      ];
      waUrl = `https://wa.me/${adminWa}?text=${encodeURIComponent(lines.join('\n'))}`;
    }

    res.json({ success: true, submittedAt, waUrl });
  } catch (err) {
    console.error('[POST /sessions/:id/submit]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/sessions/:id — Hapus sesi (butuh auth + ownership) ──
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('photographer_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ error: 'Sesi tidak ditemukan' });
      throw fetchErr;
    }
    if (session.photographer_id !== req.user.uid) {
      return res.status(403).json({ error: 'Tidak berhak menghapus sesi ini' });
    }

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /sessions/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;