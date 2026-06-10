/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mermaid', 'pdfjs-dist'],
  },
}

export default nextConfig
