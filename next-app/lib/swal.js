/**
 * lib/swal.js — SweetAlert2 helper dengan tema dark.
 * Client-side only ('use client' harus dipakai di komponen yang import ini)
 */
import Swal from 'sweetalert2'

const BG = '#13131c'
const BG2 = '#1a1a28'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#e8e8f0'
const TEXT2 = '#a0a0b8'
const GOLD = '#bac8b1'
const RED = '#f87171'
const GREEN = '#3b82f6'
const BLUE = '#60a5fa'

const SwalDark = Swal.mixin({
  background: BG2,
  color: TEXT,
  customClass: {
    popup: 'swal-dark-popup',
    title: 'swal-dark-title',
    htmlContainer: 'swal-dark-html',
    confirmButton: 'swal-btn-confirm',
    cancelButton: 'swal-btn-cancel',
    denyButton: 'swal-btn-deny',
    icon: 'swal-dark-icon',
  },
  buttonsStyling: false,
})

export const Toast = SwalDark.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer)
    el.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

export function showToast(msg, type = 'info') {
  const iconColorMap = {
    success: GREEN, error: RED, info: BLUE, warning: GOLD,
  }
  Toast.fire({ icon: type, title: msg, iconColor: iconColorMap[type] || BLUE })
}

export async function confirmDelete(title, text) {
  const result = await SwalDark.fire({
    icon: 'warning',
    iconColor: RED,
    title: title || 'Yakin ingin menghapus?',
    html: text ? `<span style="color:${TEXT2};font-size:0.9rem">${text}</span>` : undefined,
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}

export async function confirmSubmitPhotos(count) {
  const result = await SwalDark.fire({
    iconHtml: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    title: 'Konfirmasi Pilihan',
    html: `
      <p style="color:${TEXT2};font-size:0.9rem;margin-bottom:16px">
        Anda memilih <strong style="color:${GOLD}">${count} foto</strong>.
        <br>Setelah dikonfirmasi, pilihan <strong>tidak dapat diubah</strong>.
      </p>
      <div style="background:rgba(186,200,177,0.07);border:1px solid rgba(186,200,177,0.2);border-radius:8px;padding:12px 16px;font-size:0.82rem;color:${TEXT2}">
        ⚠️ Pastikan foto yang dipilih sudah benar karena tidak bisa diulang.
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '✓ Konfirmasi Pilihan',
    cancelButtonText: 'Periksa Lagi',
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}

// Inject SweetAlert2 dark theme CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .swal-dark-popup { border: 1px solid ${BORDER} !important; border-radius: 16px !important; box-shadow: 0 24px 80px rgba(0,0,0,0.7) !important; font-family: 'Inter', 'Outfit', sans-serif !important; }
    .swal-dark-title { color: ${TEXT} !important; font-size: 1.15rem !important; font-weight: 600 !important; }
    .swal-dark-html { color: ${TEXT2} !important; }
    .swal2-actions { gap: 12px !important; }
    .swal-btn-confirm { background: linear-gradient(135deg, #3b82f6, #2563eb) !important; color: #ffffff !important; font-weight: 600 !important; border: none !important; border-radius: 8px !important; padding: 10px 20px !important; font-size: 0.875rem !important; cursor: pointer !important; }
    .swal-btn-confirm:hover { opacity: 0.88 !important; }
    .swal-btn-cancel { background: rgba(255,255,255,0.05) !important; color: ${TEXT2} !important; border: 1px solid ${BORDER} !important; border-radius: 8px !important; padding: 10px 20px !important; font-size: 0.875rem !important; cursor: pointer !important; }
    .swal-btn-cancel:hover { background: rgba(255,255,255,0.1) !important; }
    .swal-dark-icon { border-color: transparent !important; }
    .swal2-timer-progress-bar { background: ${GOLD} !important; }
    .swal2-popup.swal2-toast { background: rgba(26,26,40,0.97) !important; border: 1px solid ${BORDER} !important; border-radius: 10px !important; backdrop-filter: blur(16px) !important; padding: 12px 16px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; min-width: 260px !important; }
    .swal2-popup.swal2-toast .swal2-title { font-size: 0.875rem !important; color: ${TEXT} !important; margin: 0 !important; }
    .swal2-popup.swal2-toast .swal2-icon { border: none !important; margin: 0 8px 0 0 !important; }
  `
  document.head.appendChild(style)
}

export default SwalDark
