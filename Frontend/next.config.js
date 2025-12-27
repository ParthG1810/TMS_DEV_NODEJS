/* eslint-disable @typescript-eslint/no-var-requires */
const withTM = require('next-transpile-modules')([
  '@fullcalendar/common',
  '@fullcalendar/daygrid',
  '@fullcalendar/interaction',
  '@fullcalendar/list',
  '@fullcalendar/react',
  '@fullcalendar/timegrid',
  '@fullcalendar/timeline',
  'fontkit',
  '@react-pdf/renderer',
  '@react-pdf/font',
]);

module.exports = withTM({
  swcMinify: false,
  trailingSlash: true,
  optimizeFonts: false,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for @swc/helpers module resolution issue with fontkit
    // Add fallback for @swc/helpers paths
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };

    // Use NormalModuleReplacementPlugin to redirect @swc/helpers imports
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@swc\/helpers\/_\/_define_property/,
        require.resolve('@swc/helpers/cjs/_define_property.cjs')
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@swc\/helpers\/_\/_ts_decorate/,
        require.resolve('@swc/helpers/cjs/_ts_decorate.cjs')
      )
    );

    return config;
  },
  env: {
    // HOST
    HOST_API_KEY: 'http://localhost:47847',
    // MAPBOX
    MAPBOX_API: '',
    // FIREBASE
    FIREBASE_API_KEY: '',
    FIREBASE_AUTH_DOMAIN: '',
    FIREBASE_PROJECT_ID: '',
    FIREBASE_STORAGE_BUCKET: '',
    FIREBASE_MESSAGING_SENDER_ID: '',
    FIREBASE_APPID: '',
    FIREBASE_MEASUREMENT_ID: '',
    // AWS COGNITO
    AWS_COGNITO_USER_POOL_ID: '',
    AWS_COGNITO_CLIENT_ID: '',
    // AUTH0
    AUTH0_DOMAIN: '',
    AUTH0_CLIENT_ID: '',
  },
  // Proxy /uploads requests to backend server
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:47847/uploads/:path*',
      },
    ];
  },
});
