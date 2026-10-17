import { useParams } from 'react-router';
import { ButtonLink } from '@/ui/ButtonLink';
import { PlateStub } from './PlateStub';

export default function IslandRoute() {
  const { isla = '' } = useParams();

  return (
    <PlateStub title={`Isla · ${isla}`} documentTitle="Isla">
      <p>Las estaciones de esta isla aparecerán aquí, en el orden sugerido por Brújula.</p>
      <p>
        <ButtonLink to="/mundo" variant="quiet">
          Volver a la carta del archipiélago
        </ButtonLink>
      </p>
    </PlateStub>
  );
}
