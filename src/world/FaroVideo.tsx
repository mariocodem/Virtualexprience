import { useEffect, useRef } from 'react';
import { durationLabel, faroVideo, videoAsset } from '@/data/faroVideo';
import { Dialog } from '@/ui/Dialog';

/**
 * El video de VirtuXperience en grande. Se abre al pulsar el faro y arranca
 * solo (salvo con movimiento reducido). El video trae los subtítulos quemados;
 * la pista WebVTT queda disponible en el botón CC del reproductor, y la
 * transcripción completa, en texto debajo.
 */
export function FaroVideoDialog({
  open,
  onClose,
  autoPlay,
}: {
  open: boolean;
  onClose: () => void;
  autoPlay: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Sin gesto previo (p. ej. al recargar) el navegador puede negarse: queda el póster y los controles.
    if (open && autoPlay) video.current?.play().catch(() => undefined);
  }, [open, autoPlay]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={faroVideo.title}
      description={faroVideo.summary}
      size="wide"
    >
      {/* Montado solo mientras está abierto: al cerrar, el audio se detiene. */}
      {open && (
        <video
          ref={video}
          controls
          playsInline
          preload="metadata"
          poster={videoAsset(faroVideo.poster)}
          className="block aspect-video max-h-[62dvh] w-full border-[1.5px] border-ink bg-sea-950 object-contain"
        >
          <source src={videoAsset(faroVideo.src)} type="video/mp4" />
          <track
            kind="captions"
            srcLang="es"
            label="Español"
            src={videoAsset(faroVideo.captions)}
          />
          Tu navegador no puede reproducir este video.{' '}
          <a href={faroVideo.youtube}>Míralo en YouTube</a>.
        </video>
      )}
      <p className="mt-3 text-sm text-ink-soft">
        {faroVideo.credit} · {durationLabel(faroVideo.seconds)}. Trae subtítulos en pantalla;
        también puedes activar los del reproductor (CC).
      </p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <details className="min-w-0 flex-1 basis-80">
          <summary className="min-h-11 cursor-default font-display font-bold underline decoration-[1.5px] underline-offset-[0.22em] hover:decoration-route">
            Leer la transcripción
          </summary>
          <div className="mt-3 grid gap-4 border-t-[1.5px] border-ink pt-3">
            {faroVideo.transcript.map((section) => (
              <section key={section.heading} aria-label={section.heading}>
                <h3 className="font-display font-bold">{section.heading}</h3>
                {section.paragraphs.map((text) => (
                  <p key={text} className="mt-2">
                    {text}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </details>
        <a
          href={faroVideo.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-display font-bold underline decoration-[1.5px] underline-offset-[0.22em] hover:decoration-route"
        >
          Ver en YouTube
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </div>
    </Dialog>
  );
}

/** Portada del video en el panel del faro: vuelve a abrirlo. */
export function FaroVideoCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className="group mt-4 block w-full border-[1.5px] border-ink text-left transition-colors duration-(--dur-fast) ease-out hover:bg-plate-sunk"
    >
      <span className="relative block">
        <img
          src={videoAsset(faroVideo.poster)}
          alt=""
          width={1280}
          height={720}
          loading="lazy"
          className="block aspect-video w-full object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto flex size-14 items-center justify-center border-[1.5px] border-sea-900 bg-sea-900 text-land-sun transition-colors duration-(--dur-fast) ease-out group-hover:bg-sea-800"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M7 4.5v15l12.5-7.5z" />
          </svg>
        </span>
      </span>
      <span className="block border-t-[1.5px] border-ink px-3 py-2">
        <span className="block font-display font-bold">Ver el video de VirtuXperience</span>
        <span className="block text-sm text-ink-soft">
          {durationLabel(faroVideo.seconds)} · las seis líneas que dan nombre a las islas
        </span>
      </span>
    </button>
  );
}
