
export const PLANS = {
  [process.env.RZP_BASIC_MONTHLY]: {
    storageQuotaBytes: 2 * 1024 ** 3,
  },
  [process.env.RZP_BASIC_YEARLY]: {
    storageQuotaBytes: 2 * 1024 ** 3,
  },
  [process.env.RZP_PRO_MONTHLY]: {
    storageQuotaBytes: 5 * 1024 ** 3,
  },
  [process.env.RZP_PRO_YEARLY]: {
    storageQuotaBytes: 5 * 1024 ** 3,
  },
  [process.env.RZP_PREMIUM_MONTHLY]: {
    storageQuotaBytes: 50 * 1024 ** 3,
  },
  [process.env.RZP_PREMIUM_YEARLY]: {
    storageQuotaBytes: 10 * 1024 ** 3,
  },
};


export const FREE_STORAGE_BYTES =  1 * 1024  ** 3;