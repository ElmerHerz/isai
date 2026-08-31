import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { SupplierForm } from '@/modules/comercio/suppliers/components/supplier-form';

export const Route = createFileRoute('/_authenticated/store/suppliers/new')({
  component: NewSupplierPage,
});

function NewSupplierPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/store/suppliers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Proveedores
      </Link>

      <SupplierForm onSaved={() => navigate({ to: '/store/suppliers' })} />
    </div>
  );
}
