import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Validates request bodies against the zod schemas shared with the
 * frontend (packages/shared) so validation rules only live in one place.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Datos inválidos",
        errors: result.error.flatten(),
      });
    }
    return result.data;
  }
}
