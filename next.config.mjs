/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const serverUrl = process.env.SERVER_URL ?? "http://localhost:4000"
    return [{ source: "/api/:path*", destination: `${serverUrl}/api/:path*` }]
  },
}

export default nextConfig
