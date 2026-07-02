/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = (process.env.BACKEND_API_URL || 'http://localhost:4000').trim();
    return [
      // PROD URL: 'https://new-edu-code-testing.vercel.app/:path*'
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
};

export default nextConfig;
