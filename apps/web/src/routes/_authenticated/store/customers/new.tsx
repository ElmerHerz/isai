import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { CustomerForm } from '@/modules/comercio/customers/components/customer-form';

export const Route = createFileRoute('/_authenticated/store/customers/new')({
  component: NewCustomerPage,
});

function NewCustomerPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to="/store/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <CustomerForm onSaved={() => navigate({ to: '/store/customers' })} />
    </div>
  );
}
