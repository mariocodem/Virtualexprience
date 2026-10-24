import type { ExplorarContent } from '@/data/contentSchemas';

export function TextoFormat({ content }: { content: ExplorarContent['formats']['texto'] }) {
  return (
    <div className="space-y-6">
      {content.sections.map((section) => (
        <section key={section.heading}>
          <h3 className="font-display text-xl font-extrabold">{section.heading}</h3>
          <p className="mt-2 max-w-[65ch] leading-relaxed">{section.body}</p>
        </section>
      ))}
    </div>
  );
}
