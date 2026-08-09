process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_ACCESS_SECRET = "test-access-secret-min-32-characters-long";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-characters-long";
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL = "7d";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.NODE_ENV = "test";
