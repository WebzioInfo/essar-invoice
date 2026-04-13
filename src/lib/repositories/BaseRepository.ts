import { db } from "@/db/prisma/client";

export abstract class BaseRepository<T extends { id: string; deletedAt?: Date | null }> {
  public db = db;
  protected abstract model: any;

  async findById(id: string): Promise<T | null> {
    return await this.model.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findActive(): Promise<T[]> {
    return await this.model.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll(options: { where?: any; take?: number; skip?: number; include?: any; orderBy?: any } = {}): Promise<T[]> {
    const { where, take = 50, skip, ...rest } = options;
    return await this.model.findMany({
      where: { 
        deletedAt: null,
        ...where 
      },
      take,
      skip,
      ...rest,
    });
  }

  async count(where: any = {}): Promise<number> {
    return await this.model.count({
      where: { deletedAt: null, ...where },
    });
  }

  async findPaginated(options: { 
    page?: number; 
    limit?: number; 
    where?: any; 
    include?: any; 
    orderBy?: any 
  } = {}) {
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: { deletedAt: null, ...options.where },
        take: limit,
        skip,
        include: options.include,
        orderBy: options.orderBy || { createdAt: 'desc' },
      }),
      this.model.count({
        where: { deletedAt: null, ...options.where }
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + data.length < total
      }
    };
  }

  async softDelete(id: string, userId?: string): Promise<T> {
    return await this.model.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedById: userId 
      },
    });
  }
}
