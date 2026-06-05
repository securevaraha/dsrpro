/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  outputFileTracingIncludes: {
    '/middleware': ['./middleware.ts'],
  },
}

module.exports = nextConfig
