// Módulo Comercio — Espejo del módulo backend comercio/ (docs/comercio-mejoras-propuestas.md §4).
// Rebanada 1: Proveedores + Compras. Se construye encima de Inventario
// (existencia/costo promedio) y Finanzas (asiento contable al Contabilizar).

export { useSuppliersQuery, suppliersQueryKey } from './suppliers/use-suppliers.query';
export { useCreateSupplierMutation, type CreateSupplierInput } from './suppliers/use-create-supplier.mutation';
export { useUpdateSupplierMutation, type UpdateSupplierInput } from './suppliers/use-update-supplier.mutation';

export { usePurchasesQuery, purchasesQueryKey } from './purchases/use-purchases.query';
export { usePurchaseQuery, purchaseDetailKey } from './purchases/use-purchase.query';
export { useCreatePurchaseMutation, type CreatePurchaseInput } from './purchases/use-create-purchase.mutation';
export { useAddPurchaseLineMutation, type AddPurchaseLineInput } from './purchases/use-add-purchase-line.mutation';
export { useRemovePurchaseLineMutation } from './purchases/use-remove-purchase-line.mutation';
export { usePostPurchaseToLedgerMutation } from './purchases/use-post-purchase-to-ledger.mutation';
export { useRemovePurchaseMutation } from './purchases/use-remove-purchase.mutation';

export { useCustomersQuery, customersQueryKey } from './customers/use-customers.query';
export { useCreateCustomerMutation, type CreateCustomerInput } from './customers/use-create-customer.mutation';
export { useUpdateCustomerMutation, type UpdateCustomerInput } from './customers/use-update-customer.mutation';

export { useSalesQuery, salesQueryKey } from './sales/use-sales.query';
export { useSaleQuery, saleDetailKey } from './sales/use-sale.query';
export { useCreateSaleMutation, type CreateSaleInput, type CreateSaleLineInput } from './sales/use-create-sale.mutation';
export { useDownloadSaleInvoicePdf } from './sales/use-download-sale-invoice-pdf';

export { useProductMarginQuery, productMarginQueryKey } from './reports/use-product-margin.query';
export { useInventoryValuationQuery, inventoryValuationQueryKey } from './reports/use-inventory-valuation.query';
