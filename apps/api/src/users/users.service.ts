import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { CreateUserDto, UpdateUserDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  lastLoginAt: true,
  isDemo: true,
  createdAt: true,
  role: { select: { id: true, key: true, name: true } },
  teamAssignments: { select: { team: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({ select: userSelect, orderBy: { lastName: "asc" } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException("Usuario no encontrado");
    return user;
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException("Ya existe un usuario con ese email");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        teamAssignments: { create: (dto.teamIds ?? []).map((teamId) => ({ teamId })) },
      },
      select: userSelect,
    });
    await this.audit.record({ userId: actorId, action: "CREATE", entityType: "User", entityId: user.id, newValue: { ...user, password: undefined } });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const before = await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.roleId !== undefined) data.roleId = dto.roleId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.teamIds !== undefined) {
      await this.prisma.userTeamAssignment.deleteMany({ where: { userId: id } });
      await this.prisma.userTeamAssignment.createMany({ data: dto.teamIds.map((teamId) => ({ userId: id, teamId })) });
    }

    const user = await this.prisma.user.update({ where: { id }, data, select: userSelect });
    await this.audit.record({ userId: actorId, action: "UPDATE", entityType: "User", entityId: id, oldValue: before, newValue: user });
    return user;
  }

  async remove(id: string, actorId: string) {
    const before = await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.audit.record({ userId: actorId, action: "DEACTIVATE", entityType: "User", entityId: id, oldValue: before });
    return { message: "Usuario desactivado" };
  }
}
