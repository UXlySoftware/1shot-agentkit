/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Force Next.js to watch node_modules for changes
  webpack: (config, { isServer }) => {
    // Add node_modules to the watch list
    config.watchOptions = {
      ...config.watchOptions,
      poll: 1000,
      ignored: /node_modules\/(?!.*@coinbase|.*@uxly|.*openai).*/,
    };
    return config;
  },
};

module.exports = nextConfig;
