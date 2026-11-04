export interface ProductItem {
  id: string;
  name: string;
  pricingWithGst: boolean;
  monthlyPrice: number | null;
  quarterlyPrice: number | null;
  halfYearlyPrice: number | null;
  yearlyPrice: number | null;
  hasFreeTrial: boolean;
  freeTrialDays: number;
  riskAbove: string | null;
  telegram: string | null;
  isActive: boolean;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  pricingWithGst?: boolean;
  monthlyPrice?: number | null;
  quarterlyPrice?: number | null;
  halfYearlyPrice?: number | null;
  yearlyPrice?: number | null;
  hasFreeTrial?: boolean;
  riskAbove?: string | null;
  telegram?: string | null;
}

export interface UpdateProductInput {
  id: string;
  name: string;
  pricingWithGst?: boolean;
  monthlyPrice?: number | null;
  quarterlyPrice?: number | null;
  halfYearlyPrice?: number | null;
  yearlyPrice?: number | null;
  hasFreeTrial?: boolean;
  riskAbove?: string | null;
  telegram?: string | null;
}

