import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCustomersQuery } from '@/modules/comercio';
import { CustomerForm } from '@/modules/comercio/customers/components/customer-form';

export const Route = createFileRoute('/_authenticated/store/customers/$customerId')({
  component: EditCustomerPage,
});

function EditCustomerPage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const { data: customers } = useCustomersQuery();
  const customer = customers?.find((c) => c.id === customerId);

  return (
    <div>
      <Link
        to="/store/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      {customer && <CustomerForm customer={customer} onSaved={() => navigate({ to: '/store/customers' })} />}
    </div>
  );
}
