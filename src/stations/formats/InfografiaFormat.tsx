import type { ExplorarContent } from '@/data/contentSchemas';

type Infografia = NonNullable<ExplorarContent['formats']['infografia']>;

/** Infografía como plancha: nodos numerados unidos por la ruta, legibles también en texto. */
export function InfografiaFormat({ content }: { content: Infografia }) {
  return (
    <figure>
      <figcaption className="font-display text-xl font-extrabold">{content.title}</figcaption>
      <ol className="relative mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {content.nodes.map((node, i) => (
          <li key={node.label} className="relative grid grid-cols-[auto_1fr] gap-x-4 md:block">
            <span
              aria-hidden="true"
              className="relative z-[1] flex size-12 items-center justify-center rounded-full border-2 border-ink bg-land-sun font-display text-xl font-extrabold tabular-nums"
            >
              {i + 1}
            </span>
            <div className="md:mt-4">
              <p className="font-display text-lg font-extrabold">{node.label}</p>
              <p className="mt-1 text-sm text-ink-soft">{node.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
