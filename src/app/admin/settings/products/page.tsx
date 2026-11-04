import { requireAdminSession } from "@/src/lib/auth-guard";
import { getProductsAction } from "@/src/features/products/actions";
import { ProductsClient } from "@/src/features/products/products-client";

export const instant = false;

export const metadata = {
  title: "Product List | Stock Emphasis CRM",
  description: "Manage investment service packages, duration pricing, and free trial configurations.",
};

export default async function ProductsPage() {
  await requireAdminSession();

  const res = await getProductsAction();

  return <ProductsClient initialProducts={res.products ?? []} />;
}
