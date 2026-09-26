/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["images.unsplash.com", "blob.vercel-storage.com"],
  },
  transpilePackages: ["@xanhtantay/types"],
};

export default nextConfig;
