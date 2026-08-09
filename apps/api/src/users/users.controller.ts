import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { createUserSchema, PERMISSIONS, updateUserSchema } from "@futboljoven/shared";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.create(body, user.id);
  }

  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateUserSchema)) body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.update(id, body, user.id);
  }

  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(id, user.id);
  }
}
