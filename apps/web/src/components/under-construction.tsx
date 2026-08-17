import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentModuleColor } from '@/components/layout/use-current-module-color';

export function UnderConstruction({ title }: { title: string }) {
  const color = useCurrentModuleColor();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            <Construction className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            Esta pantalla está en construcción.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
