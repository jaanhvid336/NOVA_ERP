import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/atlas_erp_db',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-before-deploy-12345',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
