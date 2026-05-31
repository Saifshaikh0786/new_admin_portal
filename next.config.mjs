/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/admin/admin/analytics/:path*',
        destination: 'http://localhost:5000/admin/analytics/:path*',
      },
      {
        source: '/api/proxy/admin/:path*',
        destination: 'https://ap-is-seven.vercel.app/:path*',
      },
      {
        source: '/api/proxy/student/:path*',
        destination: 'https://ap-is-seven.vercel.app/:path*',
      },
      {
        source: '/api/proxy/teacher/:path*',
        destination: 'https://ap-is-seven.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;
