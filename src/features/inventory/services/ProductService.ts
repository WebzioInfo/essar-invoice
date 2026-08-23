import { db } from "@/db/prisma/client";
import { ProductRepository } from "../repositories/ProductRepository";
import { validateData } from "@/lib/validation";
import { productSchema } from "../validators/productSchema";
import { serializePrisma } from "@/utils/serialization";
import { recordAuditLog } from "@/lib/audit";

const productRepo = new ProductRepository();

export class ProductService {
  /**
   * Creates a new product and initializes its stock record atomically.
   */
  static async createProduct(userId: string, data: any) {
    const validatedData = await validateData(productSchema, data);
    
    // Atomically create Product and linked Stock record
    const product = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          ...validatedData,
          stock: {
            create: {
              quantity: 0,
            },
          },
        },
        include: {
          stock: true,
        },
      });

      return p;
    }, { timeout: 30000, maxWait: 10000 });

    // Non-blocking audit logging
    recordAuditLog(db, {
      userId,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      details: validatedData,
    }).catch(() => {});

    return serializePrisma(product);
  }

  /**
   * Updates an existing product.
   */
  static async updateProduct(userId: string, productId: string, rawData: any) {
    const validatedData = await validateData(productSchema, rawData);
    
    const product = await db.product.update({
      where: { id: productId },
      data: validatedData,
    });

    recordAuditLog(db, {
      userId,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: productId,
      details: validatedData,
    }).catch(() => {});

    return serializePrisma(product);
  }

  /**
   * Soft deletes a product.
   */
  static async deleteProduct(userId: string, productId: string) {
    return await productRepo.softDelete(productId, userId);
  }

  /**
   * Fetches all active products.
   */
  static async getAllActive(select?: any) {
    const products = await db.product.findMany({
      where: { deletedAt: null },
      select,
      orderBy: { description: 'asc' },
    });

    return serializePrisma(products);
  }
}
