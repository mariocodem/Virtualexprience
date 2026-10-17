import { ButtonLink } from '@/ui/ButtonLink';
import { PlateStub } from './PlateStub';

export default function WorldRoute() {
  return (
    <PlateStub title="Carta del archipiélago" documentTitle="El mundo">
      <p>
        Seis islas rodean al Faro Minuto. Cada una guarda un fragmento de luz que se recupera
        desarrollando una competencia.
      </p>
      <p>
        <ButtonLink to="/mundo/comunicarte" variant="secondary">
          Zarpar hacia ComunicArte
        </ButtonLink>
      </p>
    </PlateStub>
  );
}
