import { db } from "@/db/prisma/client";

export class CompanyService {
  /**
   * Fetches the singleton company settings record.
   * If none exists, it creates it with the ESSAR Enterprises defaults.
   */
  static async getSettings() {
    let settings = await db.companySetting.findFirst();

    if (!settings) {
      // Initialize with ESSAR Enterprises defaults
      settings = await db.companySetting.create({
        data: {
          companyName: "ESSAR ENTERPRISES",
          gstin: "29AOPPM7487J1ZV",
          pan: "APOPM7487J",
          address1: "SITE NO.9, SEEGAHALLI VILLAGE",
          address2: "KR PURAM HOBLI",
          city: "BANGALORE",
          state: "Keralam",
          pincode: "560049",
          phone: "+91 85531 85300",
          email: "essarenterprises@gmail.com",
          bankName: "FEDERAL BANK",
          bankBranch: "CHELARI",
          bankAccountNo: "16470200011150 ",
          bankIfsc: "FDRL0001647",
          bankAccountName: "ESSAR ENTERPRISES",
          showPkgDetails: false,
        },
      });
    }

    return settings;
  }

  /**
   * Updates the company settings.
   */
  static async updateSettings(id: string, data: any) {
    return await db.companySetting.update({
      where: { id },
      data,
    });
  }
}
