import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>ISAI</h1>
      <p>Sistema de Administración Integral — en construcción.</p>
    </div>
  );
}
