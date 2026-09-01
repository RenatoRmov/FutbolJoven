import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateFinancialEntryDto } from "@futboljoven/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.financialEntry.findMany({
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateFinancialEntryDto) {
    let club = await this.prisma.club.findFirst();
    if (!club) club = await this.prisma.club.create({ data: { name: "Club" } });

    const entry = await this.prisma.financialEntry.create({
      data: { ...dto, clubId: club.id, recordedById: user.id },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });
    await this.audit.record({ userId: user.id, action: "CREATE", entityType: "FinancialEntry", entityId: entry.id, newValue: entry });
    return entry;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const before = await this.prisma.financialEntry.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Movimiento no encontrado");

    await this.prisma.financialEntry.delete({ where: { id } });
    await this.audit.record({ userId: user.id, action: "DELETE", entityType: "FinancialEntry", entityId: id, oldValue: before });
    return { deleted: true };
  }

  async getSummary() {
    const entries = await this.prisma.financialEntry.findMany({ select: { date: true, type: true, amount: true } });

    let totalIncome = 0;
    let totalExpense = 0;
    const byMonthMap = new Map<string, { income: number; expense: number }>();

    for (const entry of entries) {
      const monthKey = entry.date.toISOString().slice(0, 7); // YYYY-MM
      const bucket = byMonthMap.get(monthKey) ?? { income: 0, expense: 0 };
      if (entry.type === "INCOME") {
        totalIncome += entry.amount;
        bucket.income += entry.amount;
      } else {
        totalExpense += entry.amount;
        bucket.expense += entry.amount;
      }
      byMonthMap.set(monthKey, bucket);
    }

    const byMonth = Array.from(byMonthMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, { income, expense }]) => ({ month, income, expense, balance: Number((income - expense).toFixed(2)) }));

    return {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      balance: Number((totalIncome - totalExpense).toFixed(2)),
      byMonth,
    };
  }
}
