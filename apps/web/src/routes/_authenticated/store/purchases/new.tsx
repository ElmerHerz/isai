import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { PurchaseHeaderForm } from '@/modules/comercio/purchases/components/purchase-header-form';
import { PurchaseWorkspace } from '@/modules/comercio/purchases/components/purchase-workspace';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export const Route = createFileRoute('/_authenticated/store/purchases/new')({
  component: NewPurchasePage,
});

function NewPurchasePage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');
  const [createdPurchaseId, setCreatedPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  return (
    <div>
      <Link to="/store/purchases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Compras
      </Link>

      {createdPurchaseId ? (
        <PurchaseWorkspace purchaseId={createdPurchaseId} />
      ) : (
        <>
          {institutions && institutions.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecciona una institución" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {institutionId && (
            <PurchaseHeaderForm institutionId={institutionId} onCreated={(purchase) => setCreatedPurchaseId(purchase.id)} />
          )}
        </>
      )}
    </div>
  );
}
