/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // required for cPanel / Phusion Passenger deploy
  images: {
    unoptimized: true, // shared hosting can't run sharp reliably
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
}

module.exports = nextConfig
