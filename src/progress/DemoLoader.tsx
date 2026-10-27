import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { world } from '@/data';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { useToast } from '@/ui/toastContext';
import { demoProgress } from './demo';
import { hasProgress } from './selectors';
import { pickProgress, useProgress } from './store';

/**
 * Atiende `?demo=1` en cualquier ruta: precarga el recorrido de demostración y
 * quita el parámetro. Si ya hay una expedición en marcha, pregunta antes de
 * reemplazarla.
 */
export function DemoLoader() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  if (params.get('demo') !== '1') return null;

  const done = () => {
    setParams(
      (current) => {
        current.delete('demo');
        return current;
      },
      { replace: true },
    );
  };
  return <DemoRequest key={location.key} onDone={done} />;
}

function DemoRequest({ onDone }: { onDone: () => void }) {
  const replace = useProgress((s) => s.replace);
  const { notify } = useToast();
  // Se decide al llegar: después de cargar la demo, el progreso ya no está vacío.
  const [ask] = useState(() => hasProgress(pickProgress(useProgress.getState())));
  const handled = useRef(false);

  const load = () => {
    replace(demoProgress(world));
    notify({
      title: 'Recorrido de demostración listo',
      description:
        'Seis islas visitadas, NeuroMath completa y la Sala de Redacción esperándote en ComunicArte.',
      tone: 'info',
    });
  };

  useEffect(() => {
    if (ask || handled.current) return;
    handled.current = true;
    load();
    onDone();
  });

  return (
    <Dialog
      open={ask}
      onClose={onDone}
      title="¿Cargar el recorrido de demostración?"
      description="Reemplaza tu progreso en este navegador (XP, insignias, fragmentos y bitácora) por una expedición de muestra."
    >
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            load();
            onDone();
          }}
        >
          Cargar el recorrido
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Conservar mi progreso
        </Button>
      </div>
    </Dialog>
  );
}
