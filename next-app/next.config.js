/** @type {import('next').NextConfig} */
const nextConfig = {
  // Izinkan gambar dari lh3.googleusercontent.com (Google Drive thumbnails)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      }
    ],
  },

  // Izinkan HMR WebSocket dari IP jaringan lokal (akses via LAN)
  allowedDevOrigins: [
    '10.14.123.105',
    'localhost',
    '127.0.0.1',
  ],
}

module.exports = nextConfig
