import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module';

/**
 * ProyectosModule — Schema "proyectos" de Postgres
 *
 * Antes vivía dentro de FinanzasModule (schema "finanzas"); separado en
 * módulo propio — ver docs/finanzas-mejoras-propuestas.md §6: Proyectos es
 * conceptualmente un feature de recaudación de iglesia (campañas con meta y
 * fecha), no del motor contable genérico. Sigue consumiendo LedgerService y
 * ApprovalsModule (ambos exportados por FinanzasModule) para contabilizar y
 * aprobar gastos, en vez de tener su propia lógica — ver ProjectsModule. El
 * motor de aprobación vivió acá hasta que también necesitó gobernar gastos
 * de Fondo de Grupo — ver finanzas/approvals/.
 *
 * Regla: Este módulo es el único que accede al schema "proyectos" de Prisma.
 */
@Module({
  imports: [ProjectsModule],
  exports: [ProjectsModule],
})
export class ProyectosModule {}
