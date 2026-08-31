import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';
import { usePersonQuery } from '@/modules/membresia';
import { PersonDetailContent } from '@/modules/membresia/persons/components/person-detail-content';
import { PageHeader } from '@/components/layout/page-header';

export const Route = createFileRoute('/_authenticated/membership/persons/$personId/')({
  component: PersonDetailPage,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function PersonDetailPage() {
  const { personId } = Route.useParams();
  const { data: person } = usePersonQuery(personId);

  return (
    <div>
      <Link
        to="/membership/persons"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Personas
      </Link>

      <div className="mt-3">
        <PageHeader
          icon={Users}
          title={person ? `${person.firstName} ${person.lastName}` : 'Persona'}
          description={person ? [person.personType.name, person.branch?.name].filter(Boolean).join(' · ') : undefined}
        />
      </div>

      <motion.div initial="hidden" animate="show" variants={fadeUp} className="mt-6">
        <PersonDetailContent personId={personId} />
      </motion.div>
    </div>
  );
}
