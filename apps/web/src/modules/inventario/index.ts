// Módulo Inventario — Espejo del módulo backend inventario/ (docs/comercio-mejoras-propuestas.md).
// Rebanada 1: catálogo de productos + categorías, sin existencias/movimientos
// todavía (próxima rebanada). Módulo base, independiente de Comercio.

export { useProductsQuery, productsQueryKey } from './products/use-products.query';
export { useProductQuery, productDetailKey } from './products/use-product.query';
export { useCreateProductMutation, type CreateProductInput } from './products/use-create-product.mutation';
export { useUpdateProductMutation, type UpdateProductInput } from './products/use-update-product.mutation';
export { useAddProductUnitMutation, type AddProductUnitInput } from './products/use-add-product-unit.mutation';
export { useRemoveProductUnitMutation } from './products/use-remove-product-unit.mutation';

export { useProductCategoriesQuery, productCategoriesQueryKey } from './product-categories/use-product-categories.query';
export { useCreateProductCategoryMutation } from './product-categories/use-create-product-category.mutation';
export {
  useUpdateProductCategoryMutation,
  type UpdateProductCategoryInput,
} from './product-categories/use-update-product-category.mutation';

export { useProductStockQuery, productStockQueryKey } from './inventory/use-product-stock.query';
export { useProductMovementsQuery, productMovementsQueryKey } from './inventory/use-product-movements.query';
export { useAdjustStockMutation, type AdjustStockInput } from './inventory/use-adjust-stock.mutation';
export { useConsumeStockMutation, type ConsumeStockInput } from './inventory/use-consume-stock.mutation';

export { useAssetsQuery, assetsQueryKey } from './assets/use-assets.query';
export { useAssetQuery, assetDetailKey } from './assets/use-asset.query';
export { useAssetMovementsQuery, assetMovementsQueryKey } from './assets/use-asset-movements.query';
export { useCreateAssetMutation, type CreateAssetInput } from './assets/use-create-asset.mutation';
export { useUpdateAssetMutation, type UpdateAssetInput } from './assets/use-update-asset.mutation';
export { useAssignCustodianMutation, type AssignCustodianInput } from './assets/use-assign-custodian.mutation';
export { useRelocateAssetMutation, type RelocateAssetInput } from './assets/use-relocate-asset.mutation';
export { useSetConditionMutation, type SetConditionInput } from './assets/use-set-condition.mutation';
export { useDisposeAssetMutation } from './assets/use-dispose-asset.mutation';
