import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
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

  // Hosting platforms (Railway, Render, etc.) inject PORT and expect the
  // app to bind to it; API_PORT/3001 is the local-dev fallback.
  const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`FutbolJoven API listening on port ${port}`);
}

bootstrap();
