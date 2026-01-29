module.exports = {
  apps: [
    {
      name: 'plataforma-sama',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
