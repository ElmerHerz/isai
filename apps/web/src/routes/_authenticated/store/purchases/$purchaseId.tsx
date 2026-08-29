import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PurchaseWorkspace } from '@/modules/comercio/purchases/components/purchase-workspace';

export const Route = createFileRoute('/_authenticated/store/purchases/$purchaseId')({
  component: PurchaseDetailPage,
});

function PurchaseDetailPage() {
  const { purchaseId } = Route.useParams();

  return (
    <div>
      <Link to="/store/purchases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Compras
      </Link>

      <PurchaseWorkspace purchaseId={purchaseId} />
    </div>
  );
}
