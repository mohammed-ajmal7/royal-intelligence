import type {NextConfig} from 'next';
const config:NextConfig={...(process.env.SITES_EXPORT?{output:'export' as const}:{}),images:{unoptimized:true},poweredByHeader:false};export default config;
