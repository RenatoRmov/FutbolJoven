import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

// Split from bootstrap() so the Vercel serverless handler (apps/api/api/index.js)
// can reuse the exact same Express app without calling .listen(), which is
// invalid outside a long-running process.
export async function createApp() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // Bulk import "confirm" posts back every previewed row (can be several
  // hundred players) as JSON — the default body-parser limit is too small.
  app.use(json({ limit: "5mb" }));
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",").map((o) => o.trim()),
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api");

  await app.init();
  return app;
}

async function bootstrap() {
  const app = await createApp();

  // Hosting platforms (Railway, Render, etc.) inject PORT and expect the
  // app to bind to it; API_PORT/3001 is the local-dev fallback.
  const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`FutbolJoven API listening on port ${port}`);
}

// Only run the long-running server when this file is executed directly
// (local dev, or a traditional host like Railway/Render). When the Vercel
// serverless handler requires this module instead, it just wants createApp.
if (require.main === module) {
  bootstrap();
}
