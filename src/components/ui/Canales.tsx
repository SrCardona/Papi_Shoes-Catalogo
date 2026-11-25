import { ArrowUpRight, Instagram, MessageCircle, Music2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  arroba,
  cx,
  formatPhoneDisplay,
  generateDirectWhatsAppContact,
  instagramUrl,
  tiktokUrl,
} from '../../lib/utils';

interface Canal {
  nombre: string;
  dato: string;
  accion: string;
  href: string;
  Icon: LucideIcon;
}

/**
 * WhatsApp, Instagram y TikTok con el usuario escrito. Antes las redes eran
 * dos íconos sin nombre al final del pie: quien quería seguir la tienda no
 * sabía cómo buscarla. Salen de los ajustes, así que cambiar un usuario en el
 * panel lo cambia aquí, y un canal sin usuario simplemente no se dibuja.
 */
export function Canales({ className }: { className?: string }) {
  const { settings } = useStore();
  const ig = instagramUrl(settings.instagramHandle);
  const tk = tiktokUrl(settings.tiktokHandle);

  const canales: Canal[] = [
    {
      nombre: 'WhatsApp',
      dato: formatPhoneDisplay(settings.whatsappNumber),
      accion: 'Pedidos y asesoría uno a uno',
      href: generateDirectWhatsAppContact(settings),
      Icon: MessageCircle,
    },
    ...(ig
      ? [
          {
            nombre: 'Instagram',
            dato: arroba(settings.instagramHandle),
            accion: 'Los pares nuevos, primero aquí',
            href: ig,
            Icon: Instagram,
          },
        ]
      : []),
    ...(tk
      ? [
          {
            nombre: 'TikTok',
            dato: arroba(settings.tiktokHandle),
            accion: 'Los pares en video',
            href: tk,
            Icon: Music2,
          },
        ]
      : []),
  ];

  return (
    <ul className={cx('grid sm:grid-cols-3 gap-4 lg:gap-6', className)}>
      {canales.map(({ nombre, dato, accion, href, Icon }) => (
        <li key={nombre}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${nombre} de ${settings.storeName}: ${dato}`}
            className="group flex items-center gap-4 h-full rounded-tarjeta border border-white/10 bg-basalt px-5 py-5 transition-[border-color,transform] duration-200 ease-out hover:border-silver/40 active:scale-[0.98]"
          >
            <span className="w-12 h-12 shrink-0 rounded-full border border-white/16 flex items-center justify-center text-marble">
              <Icon className="w-5 h-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-rotulo font-semibold uppercase tracking-[0.18em] text-lapis-texto">
                {nombre}
              </span>
              <span className="block mt-1 text-[16px] font-semibold text-marble truncate">
                {dato}
              </span>
              <span className="block mt-0.5 text-lectura text-secundario">{accion}</span>
            </span>
            <ArrowUpRight
              aria-hidden
              className="w-4 h-4 shrink-0 text-terciario transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-marble"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
