import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Package,
  Percent,
  SearchCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Delivery, StoreSettings, StoryHighlight, StorySlide } from '../../types';
import { INITIAL_STORIES, STORY_WHATSAPP_MESSAGES } from '../../data/initialData';
import { useStore } from '../../context/StoreContext';
import { SmartImage } from './SmartImage';
import { TempleMark } from './TempleMark';
import { generateDirectWhatsAppContact, waHref } from '../../lib/utils';

/**
 * Las diez historias destacadas del manual de marca.
 *
 * En la versión anterior estos componentes existían pero nunca se montaban:
 * unas 315 líneas que el usuario jamás veía. Aquí vuelven a la portada.
 */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  ShieldCheck,
  Package,
  ShoppingBag,
  SearchCheck,
  Truck,
  Percent,
  HelpCircle,
  Star,
};

function HighlightIcon({ name }: { name: string }) {
  if (name === 'Temple') return <TempleMark variant="line" className="w-5 h-5" />;
  const Icon = ICONS[name] ?? Star;
  return <Icon className="w-5 h-5" />;
}

/**
 * Las diapositivas que toca mostrar para una historia.
 *
 * Cuatro de las diez se llenan con material que sube el dueño, y ninguna vive
 * en el código: clientes sale de las entregas ya cargadas, y envíos, promos y
 * reseñas de Panel › Ajustes › Historias. Mientras esas fuentes estén vacías
 * se enseña la diapositiva de ejemplo de `INITIAL_STORIES`, y si tampoco hay,
 * un texto de relleno; así el visor nunca abre en blanco.
 */
function resolveSlides(
  story: StoryHighlight,
  deliveries: Delivery[],
  settings: StoreSettings,
): StorySlide[] {
  if (story.id === 'clientes') {
    if (!deliveries.length) {
      return [
        {
          image: story.slides[0]?.image ?? story.previewImage,
          caption: 'Pronto aquí las historias de nuestros clientes.',
        },
      ];
    }
    return [...deliveries]
      .sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt))
      .map((delivery) => ({
        image: delivery.image,
        title: delivery.productName || undefined,
        caption: [delivery.neighborhood, delivery.city].filter(Boolean).join(' · '),
      }));
  }

  const propias: Record<string, StorySlide[]> = {
    envios: settings.shippingSlides,
    promos: settings.promoSlides,
    resenas: settings.reviewSlides,
  };
  const subidas = propias[story.id];
  if (subidas?.length) return subidas;

  // Reseñas es la excepción entre las de ejemplo: la diapositiva que trae el
  // sitio afirma una calificación que nadie ha dejado todavía. Mejor decir que
  // están por venir que enseñar una reseña inventada. La de ejemplo sigue en
  // INITIAL_STORIES por si se quiere recuperar.
  if (story.id === 'resenas') {
    return [
      {
        image: story.slides[0]?.image ?? story.previewImage,
        caption: 'Pronto aquí las reseñas de nuestros clientes.',
      },
    ];
  }

  return story.slides;
}

export function HighlightRail() {
  const navigate = useNavigate();
  const { deliveries, settings } = useStore();
  const [active, setActive] = useState<StoryHighlight | null>(null);

  /* Estable: el visor la usa dentro de sus efectos, y una flecha nueva en cada
     render de esta lista le reiniciaría el temporizador. */
  const close = useCallback(() => setActive(null), []);

  /**
   * Un solo sitio decide qué hace cada círculo. Los que abren WhatsApp o
   * navegan no montan el visor: sería un paso de más para llegar a algo que
   * el cliente ya pidió al tocar.
   */
  const open = (story: StoryHighlight) => {
    const behavior = story.behavior ?? { type: 'slides' as const };

    switch (behavior.type) {
      case 'navigate':
        navigate(behavior.to);
        return;

      case 'catalog-filter':
        navigate(`/catalogo?marca=${encodeURIComponent(behavior.filter)}`);
        return;

      case 'whatsapp': {
        const message =
          STORY_WHATSAPP_MESSAGES[behavior.messageKey] ??
          `Hola, quiero información sobre ${story.title.toLowerCase()} 👟`;
        window.open(
          waHref(settings.whatsappNumber, message),
          '_blank',
          'noopener,noreferrer',
        );
        return;
      }

      default:
        setActive({ ...story, slides: resolveSlides(story, deliveries, settings) });
    }
  };

  return (
    <>
      <section className="border-y border-white/8 bg-basalt/30">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-7">
          {/* El scroll vive en el contenedor y el centrado en la fila.
              `w-max` le da a la fila el ancho de sus diez círculos, así que
              `mx-auto` la centra cuando sobra sitio y no hace nada cuando no:
              al desbordar, los márgenes automáticos se resuelven a cero y el
              scroll arranca en el primer círculo. Con `justify-center` en el
              contenedor el sobrante se repartiría a los dos lados y la mitad
              de la izquierda quedaría fuera de alcance. */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-7 w-max mx-auto">
              {INITIAL_STORIES.map((story) => (
                <button
                  key={story.id}
                  onClick={() => open(story)}
                  aria-label={story.title}
                  className="group flex flex-col items-center gap-2.5 shrink-0 w-[74px]"
                >
                  <span className="relative w-[58px] h-[58px] rounded-full border border-silver/25 group-hover:border-silver/70 flex items-center justify-center text-silver/70 group-hover:text-silver transition-all duration-300 group-hover:-translate-y-0.5">
                    <HighlightIcon name={story.iconName} />

                    {/* Las que abren WhatsApp llevan un punto apagado: avisa
                        que el toque sale de la página sin gritar. */}
                    {story.behavior?.type === 'whatsapp' && (
                      <span
                        aria-hidden
                        className="absolute top-0 right-0 w-1 h-1 rounded-full bg-emerald-500/70"
                      />
                    )}
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-marble/45 group-hover:text-marble/85 text-center leading-tight transition-colors">
                    {story.label ?? story.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {active && <StoryViewer story={active} onClose={close} />}
    </>
  );
}

const SLIDE_MS = 6000;

function StoryViewer(props: { story: StoryHighlight; onClose: () => void }) {
  // `key` reinicia el visor al cambiar de historia: índice y progreso vuelven
  // a cero sin necesidad de un efecto que dispare renders en cascada.
  return <StoryViewerContent key={props.story.id} {...props} />;
}

function StoryViewerContent({
  story,
  onClose,
}: {
  story: StoryHighlight;
  onClose: () => void;
}) {
  const { settings } = useStore();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const slide = story.slides[index];
  const isLast = index === story.slides.length - 1;

  /* Estables a propósito: los dos efectos de abajo las usan, y si cambiaran de
     identidad en cada render el temporizador se reiniciaría solo y la
     diapositiva no avanzaría nunca. `next` solo se rehace cuando `isLast`
     cambia de valor, que pasa junto con `index` —que ya reinicia el
     temporizador—, así que esto no agrega ni una vuelta de más. */
  const next = useCallback(
    () => (isLast ? onClose() : setIndex((i) => i + 1)),
    [isLast, onClose],
  );
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const pct = ((Date.now() - started) / SLIDE_MS) * 100;
      if (pct >= 100) {
        clearInterval(timer);
        next();
      } else {
        setProgress(pct);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [index, paused, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, next, prev, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-obsidian/97 backdrop-blur-sm flex items-center justify-center p-4 animate-fade"
      role="dialog"
      aria-modal="true"
      aria-label={story.title}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar historia"
        className="absolute top-5 right-5 p-2.5 text-marble/60 hover:text-marble z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="relative w-full max-w-[400px] aspect-[9/16] bg-basalt overflow-hidden"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Barras de progreso */}
        <div className="absolute top-3 inset-x-3 z-20 flex gap-1.5">
          {story.slides.map((_, i) => (
            <div key={i} className="flex-1 h-[2px] bg-marble/25 overflow-hidden">
              <div
                className="h-full bg-marble transition-[width] duration-75"
                style={{
                  width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <SmartImage
          src={slide.image}
          alt={slide.title ?? story.title}
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/25 to-obsidian/55" />

        {/* Zonas de navegación */}
        <button
          onClick={prev}
          aria-label="Anterior"
          className="absolute left-0 inset-y-0 w-1/3 z-10 flex items-center px-3 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-6 h-6 text-marble/70" />
        </button>
        <button
          onClick={next}
          aria-label="Siguiente"
          className="absolute right-0 inset-y-0 w-1/3 z-10 flex items-center justify-end px-3 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-6 h-6 text-marble/70" />
        </button>

        {/* Contenido */}
        <div className="absolute inset-x-0 bottom-0 p-6 space-y-3 z-10">
          {slide.badge && (
            <span className="inline-block bg-marble text-obsidian text-[8px] font-bold uppercase tracking-[0.2em] px-2.5 py-1">
              {slide.badge}
            </span>
          )}
          {slide.title && (
            <h3 className="font-display text-3xl text-marble leading-none">
              {slide.title}
            </h3>
          )}
          <p className="text-[13px] text-marble/70 leading-relaxed">{slide.caption}</p>
          {slide.ctaText && (
            <a
              href={generateDirectWhatsAppContact(settings, story.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-5 py-3 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              {slide.ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
