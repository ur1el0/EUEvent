const LOCAL_DEMO_HTTP = process.env.EUEVENT_LOCAL_DEMO_HTTP === 'true';

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    package: 'ph.edu.mseuf.euevent',
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: LOCAL_DEMO_HTTP,
        },
      },
    ],
  ],
});
