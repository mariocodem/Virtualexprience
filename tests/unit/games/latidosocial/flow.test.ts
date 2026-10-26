import { describe, expect, it } from 'vitest';
import {
  assignSelected,
  bedSpot,
  bedWork,
  crewSpot,
  growthOf,
  initialReparto,
  isReady,
  moonSky,
  pressKey,
  selectGroup,
  type RepartoContext,
} from '@/games/latidosocial/huerta/flow';
import { huertaContentSchema } from '@/data/contentSchemas';
import raw from '@/data/content/latidosocial-huerta.json';
import {
  assign,
  huertaPlan,
  REST,
  selectMoons,
  startHuerta,
} from '@/minigames/huerta-comunitaria/engine';

const content = huertaContentSchema.parse(raw);
const ctx: RepartoContext = {
  groups: content.groups.map((g) => g.id),
  tasks: ['a', 'b', 'c'],
  resting: [],
};

describe('teclado del reparto', () => {
  it('un número elige el grupo y el siguiente, su tarea', () => {
    let step = pressKey(initialReparto([]), ctx, '2');
    expect(step.reparto.selected).toBe('jovenes');
    step = pressKey(step.reparto, ctx, '3');
    expect(step.reparto.selected).toBeNull();
    expect(step.reparto.choices).toEqual({ jovenes: 'c' });
  });

  it('0 o R llevan al grupo a descansar y Retroceso lo suelta', () => {
    const picked = pressKey(initialReparto([]), ctx, '1').reparto;
    expect(pressKey(picked, ctx, '0').reparto.choices).toEqual({ abuelas: REST });
    expect(pressKey(picked, ctx, 'r').reparto.choices).toEqual({ abuelas: REST });
    expect(pressKey(picked, ctx, 'Backspace').reparto.selected).toBeNull();
  });

  it('ignora números fuera de rango y teclas que no son del juego', () => {
    const start = initialReparto([]);
    expect(pressKey(start, ctx, '9').reparto).toEqual(start);
    expect(pressKey(start, ctx, 'x').reparto).toEqual(start);
    const picked = pressKey(start, ctx, '1').reparto;
    expect(pressKey(picked, ctx, '4').reparto).toEqual(picked);
  });

  it('un grupo agotado no se puede elegir y ya empieza descansando', () => {
    const tired: RepartoContext = { ...ctx, resting: ['abuelas'] };
    const start = initialReparto(['abuelas']);
    expect(start.choices).toEqual({ abuelas: REST });
    const step = selectGroup(start, tired, 'abuelas');
    expect(step.reparto.selected).toBeNull();
    expect(step.note).toMatch(/descansa/);
  });

  it('el reparto está listo cuando cada grupo tiene tarea o descanso', () => {
    let reparto = initialReparto([]);
    for (const g of ctx.groups) {
      expect(isReady(reparto, ctx)).toBe(false);
      reparto = assignSelected(selectGroup(reparto, ctx, g).reparto, ctx, 'a').reparto;
    }
    expect(isReady(reparto, ctx)).toBe(true);
  });

  it('no acepta una tarea que no es de la luna', () => {
    const picked = selectGroup(initialReparto([]), ctx, 'abuelas').reparto;
    expect(assignSelected(picked, ctx, 'otra').reparto).toEqual(picked);
  });
});

describe('escena de la huerta', () => {
  it('cada grupo tiene un lugar distinto aunque comparta era', () => {
    const spots = [0, 1].map((order) =>
      crewSpot({
        group: order,
        groups: 4,
        choice: 'b',
        tasks: ['a', 'b', 'c'],
        sharing: { count: 2, order },
        assembly: false,
      }),
    );
    expect(spots[0]?.x).not.toBe(spots[1]?.x);
    const bed = bedSpot(1, 3);
    expect(Math.abs((spots[0]?.x ?? 0) - bed.x)).toBeLessThan(2);
  });

  it('en asamblea todos se reúnen y al descansar van a la ceiba', () => {
    const base = { groups: 4, tasks: ['a'], sharing: { count: 1, order: 0 } };
    const assembly = crewSpot({ ...base, group: 0, choice: 'a', assembly: true });
    const rest = crewSpot({ ...base, group: 0, choice: REST, assembly: false });
    expect(assembly.z).toBeGreaterThan(3);
    expect(rest.x).toBeLessThan(-6);
  });

  it('las plantas crecen con las familias y la luna avanza en el cielo', () => {
    expect(growthOf({ familias: 0, suelo: 50 }, 70)).toBeLessThan(
      growthOf({ familias: 35, suelo: 50 }, 70),
    );
    expect(growthOf({ familias: 700, suelo: 100 }, 70)).toBeLessThanOrEqual(1);
    expect(moonSky(0, 5).phase).toBeLessThan(moonSky(4, 5).phase);
    expect(moonSky(0, 1).phase).toBeGreaterThan(0);
  });

  it('el trabajo de la luna se refleja en las eras con el mismo motor', () => {
    const plan = huertaPlan(3);
    const queue = selectMoons(content.moons, plan, () => 0.3);
    const moon = queue[0];
    if (!moon) throw new Error('Sin lunas');
    const start = startHuerta(content, queue, plan);
    expect(bedWork(start, moon)).toEqual(moon.tasks.map(() => 0));
    const task = moon.tasks[0];
    if (!task) throw new Error('Sin tareas');
    const worked = assign(start, content, moon, {
      abuelas: task.id,
      jovenes: task.id,
      pescadores: REST,
      estudiantes: REST,
    });
    expect(bedWork(worked, moon)[0]).toBe(1);
    expect(bedWork(worked, moon)[1]).toBe(0);
  });
});
