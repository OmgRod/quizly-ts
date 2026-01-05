import { defineConfig } from '@prisma/internals';

export default defineConfig({
  datasource: {
    db: {
      provider: 'sqlite',
      url: process.env.DATABASE_URL,
    },
  },
});
