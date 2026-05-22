import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [{ source: '/', destination: '/app', permanent: false }];
  },
};

export default config;
