import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useInstitutionsQuery } from '@/modules/general';
import { SaleCartForm } from '@/modules/comercio/sales/components/sale-cart-form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export const Route = createFileRoute('/_authenticated/store/sales/new')({
  component: NewSalePage,
});

function NewSalePage() {
  const { data: institutions } = useInstitutionsQuery();
  const [institutionId, setInstitutionId] = useState('');

  useEffect(() => {
    if (!institutionId && institutions?.length) {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  return (
    <div>
      <Link to="/store/sales" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Ventas
      </Link>

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

      {institutionId && <SaleCartForm institutionId={institutionId} />}
    </div>
  );
}
