import { ButtonLink } from '@/ui/ButtonLink';
import { PlateStub } from './PlateStub';

export default function NotFoundRoute() {
  return (
    <PlateStub title="Esta carta no existe" documentTitle="Carta no encontrada">
      <p>La dirección no lleva a ninguna isla del archipiélago.</p>
      <p>
        <ButtonLink to="/">Volver al inicio</ButtonLink>
      </p>
    </PlateStub>
  );
}
