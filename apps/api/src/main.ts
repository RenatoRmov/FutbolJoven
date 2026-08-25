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
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api");

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`FutbolJoven API listening on http://localhost:${port}/api`);
}

bootstrap();
