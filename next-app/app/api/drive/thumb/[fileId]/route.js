import { NextResponse } from 'next/server'

/**
 * GET /api/drive/thumb/:fileId
 * 
 * Proxy gambar Google Drive melalui server Next.js.
 * TIDAK pernah redirect — selalu proxy byte gambar agar menghindari
 * masalah CORS, consent page, dan rate-limiting dari Google.
 */
export async function GET(req, { params }) {
  const { fileId } = await params
  const { searchParams } = new URL(req.url)
  const w = parseInt(searchParams.get('w')) || 400

  // Validasi fileId
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

  // Daftar URL yang dicoba berurutan — dari paling reliabel ke fallback
  const urlCandidates = [
    // 1. Drive API langsung dengan API key (paling reliabel untuk folder publik)
    apiKey ? `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}` : null,
    // 2. Google thumbnail endpoint (ringan, cocok untuk preview)
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${w}`,
    // 3. lh3 CDN Google (untuk file yang sudah dishare publik)
    `https://lh3.googleusercontent.com/d/${fileId}=w${w}`,
  ].filter(Boolean)

  for (const url of urlCandidates) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          // Berpura-pura sebagai browser agar Google tidak memblokir
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) continue

      const contentType = response.headers.get('content-type') || ''

      // Pastikan response berisi gambar, bukan HTML (consent/login page)
      if (contentType.includes('text/html')) continue

      const buffer = Buffer.from(await response.arrayBuffer())

      // Skip jika response terlalu kecil (kemungkinan error page)
      if (buffer.length < 200) continue

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (err) {
      // Log error dan coba URL berikutnya
      console.error(`[drive-proxy] Failed for ${url.substring(0, 60)}...: ${err.message}`)
    }
  }

  // Semua URL gagal
  console.error(`[drive-proxy] All URLs failed for fileId: ${fileId}`)
  return new NextResponse('Image not found', { status: 404 })
}
