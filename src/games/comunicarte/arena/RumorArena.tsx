import { useCallback, useMemo, useRef, useState } from 'react';
import type { Signal } from '@/data/contentSchemas';
import { TOOL_LABEL } from '@/minigames/sala-de-redaccion/labels';
import { ISLE } from '@/world/palette';
import type { ArenaProps } from '../../types';
import {
  chargeArena,
  createArena,
  strengthenBruma,
  type ArenaConfig,
  type ArenaEvent,
  type ArenaState,
} from '../../shared/arena/core';
import { Controls } from '../../shared/controls';
import { GameStage } from '../../shared/GameStage';
import { Banner, HudMeter, HudPanel, KeyHint, LightsHud } from '../../shared/hud';
import { brumaTint } from '../../shared/palette';
import { ArenaRig } from '../../shared/scene/ArenaRig';
import { ArenaLights, ArenaPlatform } from '../../shared/scene/ArenaScenery';
import type { ControlHelp } from '../../shared/stage';
import { RumorCard, type RumorFeedback } from './RumorCard';
import { RadioTower, RumorLayer, type RumorView } from './RumorScene';
import {
  arrivalEffect,
  createField,
  findRumor,
  hold,
  judge,
  resolve,
  review,
  rumorPlan,
  type Choice,
  type LiveRumor,
  type RumorEvent,
  type Tier,
} from './rumors';

const RADIUS = 9;

const HELP: ControlHelp[] = [
  { keys: 'WASD o flechas', action: 'Moverte' },
  { keys: 'E o Enter', action: 'Interceptar el rumor que tienes cerca' },
  { keys: '1 y 2', action: 'Revisar una señal del rumor interceptado' },
  { keys: '3 o 4', action: 'Desmentir el rumor o dejarlo pasar' },
  { keys: 'Ratón', action: 'Apuntar la linterna' },
  { keys: 'Espacio o clic', action: 'Disparar el haz (necesita carga)' },
  { keys: 'Mayús', action: 'Esquivar' },
  { keys: 'Esc o P', action: 'Pausa' },
];

interface Card {
  id: number;
  feedback: RumorFeedback | null;
}

/**
 * Verificar los rumores: la Bruma lanza rumores con titular hacia la torre de
 * radio. Hay que interceptarlos (E cerca), revisar una señal y decidir si se
 * desmienten o se dejan pasar. Desmentir un falso carga la linterna; detener
 * una noticia verdadera o dejar que un falso llegue a la torre fortalece a la
 * Bruma. Mientras tanto, la Bruma ataca.
 */
export function RumorArena({
  island,
  content,
  level,
  goal,
  lights,
  tiers,
  calm,
  still,
  onBrujula,
  onDecision,
  onEnd,
  onAccessible,
}: ArenaProps) {
  const [controls] = useState(() => new Controls());
  const config = useMemo<ArenaConfig>(
    () => ({ radius: RADIUS, level, goal, lights, calm }),
    [level, goal, lights, calm],
  );
  const plan = useMemo(() => rumorPlan(level, calm), [level, calm]);
  const [state] = useState<ArenaState>(() => createArena(config));
  const [field] = useState(() => createField());
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState(() => ({ ...state.player, ...state.bruma, charge: state.charge }));
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const [views, setViews] = useState<RumorView[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [near, setNear] = useState<number | null>(null);
  const [transmit, setTransmit] = useState({ n: 0, bad: false });
  const tally = useRef({ correct: 0, total: 0 });
  const ended = useRef(false);
  const cardId = useRef<number | null>(null);
  const tint = brumaTint(island.id);

  const sync = useCallback(() => {
    setHud({ ...state.player, ...state.bruma, charge: state.charge });
  }, [state]);

  const shout = (text: string) => {
    setBanner({ text, at: performance.now() });
  };

  const end = (outcome: 'victoria' | 'retirada') => {
    if (ended.current) return;
    ended.current = true;
    const { correct, total } = tally.current;
    onEnd({ outcome, accuracy: total === 0 ? 0 : correct / total, decisions: total });
  };

  const decide = (correct: boolean, rumor: LiveRumor) => {
    tally.current.total += 1;
    if (correct) tally.current.correct += 1;
    onDecision({ correct, tier: rumor.item.tier, itemId: rumor.item.id });
  };

  const refreshViews = () => {
    setViews(field.rumors.map((r) => ({ id: r.id, headline: r.item.headline })));
  };

  const onArena = (events: ArenaEvent[]) => {
    for (const event of events) {
      if (event.type === 'herido')
        setAnnounce(`La Bruma te alcanza. Te quedan ${String(event.lights)} luces.`);
      if (event.type === 'fase') shout(`La Bruma cambia de forma: fase ${String(event.phase)}`);
      if (event.type === 'haz')
        setAnnounce(event.hit ? 'Tu haz atraviesa la Bruma.' : 'El haz se pierde en la niebla.');
      if (event.type === 'sin-carga') shout('Sin carga: desmiente un rumor falso');
      if (event.type === 'victoria') end('victoria');
      if (event.type === 'retirada') end('retirada');
    }
    sync();
  };

  const onRumors = (events: RumorEvent[]) => {
    for (const event of events) {
      if (event.type === 'spawn') {
        setAnnounce('La Bruma lanza un rumor hacia la torre de radio. Acércate y pulsa E.');
      } else {
        const effect = arrivalEffect(event.rumor);
        if (effect.mistake) {
          decide(false, event.rumor);
          strengthenBruma(state);
          shout('Un rumor falso llegó a la torre');
          onBrujula({ text: effect.message, source: 'local' });
        }
        setAnnounce(effect.message);
        setTransmit((t) => ({ n: t.n + 1, bad: effect.mistake }));
      }
    }
    refreshViews();
    sync();
  };

  const intercept = (rumor: LiveRumor) => {
    if (cardId.current !== null || !hold(field, rumor.id)) return;
    cardId.current = rumor.id;
    controls.clear();
    setCard({ id: rumor.id, feedback: null });
    setAnnounce(
      `Rumor interceptado: ${rumor.item.headline}. Fuente: ${rumor.item.source}. ${rumor.item.date}. Revisa una señal con 1 o 2 y decide: 3 desmentir, 4 dejar pasar.`,
    );
  };

  const reviewSignal = (signal: Signal) => {
    const rumor = card ? findRumor(field, card.id) : undefined;
    if (!rumor || card?.feedback) return;
    const text = review(rumor, signal);
    if (text) setAnnounce(`${TOOL_LABEL[signal]}: ${text}`);
    sync();
  };

  const choose = (choice: Choice) => {
    const rumor = card ? findRumor(field, card.id) : undefined;
    if (!card || card.feedback || !rumor || state.outcome !== 'en-curso') return;
    const verdict = judge(rumor.item, choice);
    decide(verdict.correct, rumor);
    if (verdict.charge > 0) chargeArena(state, verdict.charge);
    if (verdict.strengthen) strengthenBruma(state);
    if (verdict.correct && verdict.charge >= 1)
      shout('¡Linterna cargada! Apunta a la Bruma y dispara');
    onBrujula({ text: rumor.item.explanation, source: 'local' });
    resolve(field, rumor.id, choice);
    refreshViews();
    setCard({
      id: card.id,
      feedback: { correct: verdict.correct, text: `${verdict.feedback} ${rumor.item.explanation}` },
    });
    sync();
  };

  const close = () => {
    cardId.current = null;
    // El foco vuelve al escenario: sin él, el teclado deja de mover al explorador.
    const host = document.activeElement?.closest<HTMLElement>('[role="application"]');
    setCard(null);
    host?.focus();
    onBrujula(null);
  };

  const rumor = card ? findRumor(field, card.id) : undefined;
  // Con la decisión abierta el mundo va lento; con el resultado a la vista, se detiene.
  const timeScale = () => (card ? (card.feedback ? 0 : calm ? 0.12 : 0.25) : 1);
  const tierNow = (): Tier => tiers[state.bruma.phase - 1] ?? 3;
  const density = Math.max(0, 1 - hud.hits / goal);
  const nearRumor = near !== null ? findRumor(field, near) : undefined;

  return (
    <GameStage
      label={`Arena de la ${content.bruma.name}`}
      controls={controls}
      paused={paused}
      onPause={setPaused}
      help={HELP}
      announce={announce}
      onAccessible={onAccessible}
      touch={card === null}
      hud={
        <>
          <div
            className={`absolute top-14 left-3 grid w-56 gap-2 sm:top-3 sm:w-64 ${card ? 'max-sm:hidden' : ''}`}
          >
            <HudPanel className="grid gap-2">
              <HudMeter
                label={content.bruma.name}
                value={density}
                text={`Fase ${String(hud.phase)} de 3`}
                tone="fog"
              />
              <HudMeter
                label="Carga de la linterna"
                value={Math.min(1, hud.charge)}
                text={
                  hud.charge >= 1
                    ? `${String(Math.floor(hud.charge))} disparo`
                    : hud.charge > 0
                      ? 'Carga parcial'
                      : 'Sin carga'
                }
              />
              <LightsHud lights={hud.lights} max={lights} />
            </HudPanel>
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
            {rumor && card ? (
              <RumorCard
                rumor={rumor}
                feedback={card.feedback}
                onReview={reviewSignal}
                onChoose={choose}
                onContinue={close}
                className="max-w-md"
              />
            ) : nearRumor ? (
              <KeyHint keys="E">Interceptar el rumor: «{nearRumor.item.headline}»</KeyHint>
            ) : hud.charge >= 1 ? (
              <KeyHint keys="Espacio">Disparar el haz hacia la Bruma</KeyHint>
            ) : (
              <KeyHint keys="E">
                Acércate a un rumor para interceptarlo antes de que llegue a la torre
              </KeyHint>
            )}
          </div>
        </>
      }
    >
      <ArenaLights />
      <ArenaPlatform radius={RADIUS} rim={ISLE[island.id]} />
      <RadioTower pulse={transmit} still={still} />
      <ArenaRig
        state={state}
        config={config}
        controls={controls}
        tint={tint}
        still={still}
        timeScale={timeScale}
        onEvents={onArena}
      />
      <RumorLayer
        field={field}
        plan={plan}
        arena={state}
        controls={controls}
        views={views}
        tier={tierNow}
        canSpawn={() => state.charge < 2}
        timeScale={timeScale}
        locked={() => cardId.current !== null}
        still={still}
        tint={tint}
        onEvents={onRumors}
        onIntercept={intercept}
        onNear={setNear}
      />
    </GameStage>
  );
}
