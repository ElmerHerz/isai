import { createFileRoute } from '@tanstack/react-router';
import { UnderConstruction } from '@/components/under-construction';

export const Route = createFileRoute('/_authenticated/general/pharmacy-licenses')({
  component: () => <UnderConstruction title="Licencias Sanitarias" />,
});
