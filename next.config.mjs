/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/admin/:path*',
        destination: 'https://new-edu-code-testing.vercel.app/:path*',
      },
      {
        source: '/api/proxy/student/:path*',
        destination: 'https://new-edu-code-testing.vercel.app/:path*',
      },
      {
        source: '/api/proxy/teacher/:path*',
        destination: 'https://new-edu-code-testing.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;
