import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useSuppliersQuery } from '@/modules/comercio';
import { SupplierForm } from '@/modules/comercio/suppliers/components/supplier-form';

export const Route = createFileRoute('/_authenticated/store/suppliers/$supplierId')({
  component: EditSupplierPage,
});

function EditSupplierPage() {
  const { supplierId } = Route.useParams();
  const navigate = useNavigate();
  const { data: suppliers } = useSuppliersQuery();
  const supplier = suppliers?.find((s) => s.id === supplierId);

  return (
    <div>
      <Link
        to="/store/suppliers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Proveedores
      </Link>

      {supplier && <SupplierForm supplier={supplier} onSaved={() => navigate({ to: '/store/suppliers' })} />}
    </div>
  );
}
