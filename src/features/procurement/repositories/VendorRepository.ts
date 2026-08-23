import { BaseRepository } from "@/lib/repositories/BaseRepository";
import { Vendor } from "@prisma/client";

export class VendorRepository extends BaseRepository<Vendor> {
  public model = this.db.vendor;

  async findAll(options?: any) {
    const isStringQuery = typeof options === "string";
    const query = isStringQuery ? options : options?.query;

    return await this.model.findMany({
      where: {
        deletedAt: null,
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
                { phone: { contains: query } },
                { gst: { contains: query } },
              ],
            }
          : {}),
        ...(!isStringQuery && options?.where ? options.where : {}),
      },
      orderBy: { name: "asc" },
      ...(!isStringQuery && options?.take ? { take: options.take } : {}),
      ...(!isStringQuery && options?.skip ? { skip: options.skip } : {}),
    });
  }

  async findById(id: string) {
    return await this.model.findUnique({
      where: { id, deletedAt: null },
    });
  }
}
