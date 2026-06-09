import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

/** PascalCase model name → camelCase Prisma client accessor */
function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

@Injectable()
export class AdminDatabaseService {
  constructor(private prisma: PrismaService) {}

  /** List all Prisma models with their scalar/enum column definitions. */
  listTables() {
    const models = Prisma.dmmf.datamodel.models;
    return {
      tables: models.map((model) => ({
        tableName: model.name,
        modelName: toCamelCase(model.name),
        columns: model.fields
          .filter((f) => f.kind === 'scalar' || f.kind === 'enum')
          .map((f) => ({
            name: f.name,
            type: f.kind === 'enum' ? 'Enum' : f.type,
            optional: !f.isRequired,
          })),
      })),
    };
  }

  /** Query paginated rows from a model by its PascalCase name. */
  async getTableData(
    tableName: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Record<string, unknown>[]; total: number; columns: { name: string; type: string; optional: boolean }[] }> {
    const models = Prisma.dmmf.datamodel.models;
    const model = models.find((m) => m.name === tableName);
    if (!model) {
      return { items: [], total: 0, columns: [] };
    }

    const accessor = toCamelCase(model.name);
    const delegate = (this.prisma as any)[accessor];
    if (!delegate) {
      return { items: [], total: 0, columns: [] };
    }

    const columns = model.fields
      .filter((f) => f.kind === 'scalar' || f.kind === 'enum')
      .map((f) => ({
        name: f.name,
        type: f.kind === 'enum' ? 'Enum' : f.type,
        optional: !f.isRequired,
      }));

    // Use the first unique or id field for stable ordering; fall back to no explicit order
    const idField = model.fields.find((f) => f.isId);
    const orderBy = idField ? { [idField.name]: 'asc' as const } : undefined;

    const [items, total] = await Promise.all([
      delegate.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...(orderBy ? { orderBy } : {}),
      }),
      delegate.count(),
    ]);

    return { items, total, columns };
  }
}
