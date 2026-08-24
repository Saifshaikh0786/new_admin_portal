/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = (process.env.BACKEND_API_URL || process.env.API_BASE_URL || 'https://new-edu-code-testing.vercel.app').trim();
    return [
      // PROD URL: 'https://new-edu-code-testing.vercel.app/:path*'
      {
        source: '/api/proxy/admin/api/:path*',
        destination: 'https://ap-is-seven.vercel.app/api/:path*',
      },
      {
        source: '/api/proxy/admin/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/api/proxy/student/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/api/proxy/teacher/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
