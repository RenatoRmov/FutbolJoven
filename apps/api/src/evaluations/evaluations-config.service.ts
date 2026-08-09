import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class EvaluationsConfigService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getConfig() {
    const [scales, dimensions] = await Promise.all([
      this.prisma.evaluationScale.findMany({ where: { isActive: true } }),
      this.prisma.evaluationDimension.findMany({
        where: { isActive: true },
        include: { metrics: { where: { isActive: true }, orderBy: { order: "asc" } }, scale: true },
        orderBy: { order: "asc" },
      }),
    ]);
    return {
      scales: scales.map((s) => ({ ...s, labels: JSON.parse(s.labels) as Record<string, string> })),
      dimensions: dimensions.map((d) => ({ ...d, scale: { ...d.scale, labels: JSON.parse(d.scale.labels) as Record<string, string> } })),
    };
  }

  async createDimension(dto: { key: string; name: string; order: number; scaleId: string }, userId: string) {
    const dimension = await this.prisma.evaluationDimension.create({ data: dto });
    await this.audit.record({ userId, action: "CREATE", entityType: "EvaluationDimension", entityId: dimension.id, newValue: dimension });
    return dimension;
  }

  async updateDimension(id: string, dto: Partial<{ name: string; order: number; isActive: boolean }>, userId: string) {
    const dimension = await this.prisma.evaluationDimension.update({ where: { id }, data: dto });
    await this.audit.record({ userId, action: "UPDATE", entityType: "EvaluationDimension", entityId: id, newValue: dimension });
    return dimension;
  }

  async createMetric(dimensionId: string, dto: { name: string; order: number }, userId: string) {
    const metric = await this.prisma.evaluationMetric.create({ data: { dimensionId, ...dto } });
    await this.audit.record({ userId, action: "CREATE", entityType: "EvaluationMetric", entityId: metric.id, newValue: metric });
    return metric;
  }
}
