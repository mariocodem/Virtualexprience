import { useMemo } from 'react';
import { hasWebGL2 } from '@/landing/webgl';
import { Button } from '@/ui/Button';
import { Segmented, Switch, TextSizeLabel } from './controls';
import { TEXT_SCALES, usePreferences, type Preferences, type TextStep } from './preferences';

const FONTS: { value: Preferences['font']; label: string; family: string }[] = [
  { value: 'estandar', label: 'Atlas', family: 'var(--type-display)' },
  { value: 'legible', label: 'Hiperlegible', family: "'Atkinson Hyperlegible'" },
  { value: 'dislexia', label: 'Dislexia', family: "'OpenDyslexic'" },
];

/**
 * Todos los ajustes de accesibilidad en un formulario: lo usan el panel (Alt+A)
 * y la página de accesibilidad. Cada cambio se aplica al instante y se guarda.
 */
export function PreferencesForm({ idPrefix }: { idPrefix: string }) {
  const p = usePreferences();
  const webgl = useMemo(() => hasWebGL2(), []);
  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Segmented
        legend="Tamaño del texto"
        name={`${idPrefix}-tamano`}
        value={p.textStep}
        options={TEXT_SCALES.map((scale, step) => ({
          value: step as TextStep,
          label: <TextSizeLabel scale={scale} step={step} />,
        }))}
        onChange={p.setTextStep}
      />
      <Segmented
        legend="Tipo de letra"
        name={`${idPrefix}-letra`}
        value={p.font}
        options={FONTS.map((f) => ({
          value: f.value,
          label: <span style={{ fontFamily: f.family }}>{f.label}</span>,
        }))}
        onChange={p.setFont}
      />
      <div className="grid gap-2">
        <Switch
          label="Alto contraste"
          hint="Tinta más oscura, fondo blanco y filetes más gruesos."
          checked={p.contrast === 'alto'}
          onChange={(on) => {
            p.setContrast(on ? 'alto' : 'normal');
          }}
        />
        <Switch
          label="Espaciado amplio"
          hint="Más aire entre líneas, letras y palabras."
          checked={p.spacing === 'amplio'}
          onChange={(on) => {
            p.setSpacing(on ? 'amplio' : 'normal');
          }}
        />
        <Switch
          label="Reducir movimiento"
          hint="Sin parallax, cámaras que orbitan ni textos que se revelan."
          checked={p.motion === 'reducido'}
          onChange={(on) => {
            p.setMotion(on ? 'reducido' : 'sistema');
          }}
        />
      </div>
      <Segmented
        legend="Vista del mundo"
        name={`${idPrefix}-mapa`}
        value={webgl ? p.mapMode : '2d'}
        options={[
          { value: '3d', label: 'Relieve 3D', disabled: !webgl },
          { value: '2d', label: 'Carta 2D' },
        ]}
        onChange={p.setMapMode}
      />
      <Segmented
        legend="Retos y Brumas"
        name={`${idPrefix}-juegos`}
        value={webgl ? p.gameMode : 'accesible'}
        options={[
          { value: '3d', label: 'Juego 3D', disabled: !webgl },
          { value: 'accesible', label: 'Versión accesible' },
        ]}
        onChange={p.setGameMode}
      />
      <Switch
        label="Ritmo tranquilo"
        hint="En los juegos 3D: ataques más lentos y puntería asistida."
        checked={p.calmPace}
        onChange={p.setCalmPace}
      />
      <div>
        <Button variant="quiet" onClick={p.resetPreferences}>
          Restablecer ajustes
        </Button>
      </div>
    </form>
  );
}
