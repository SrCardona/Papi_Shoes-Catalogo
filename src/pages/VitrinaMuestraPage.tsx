import { useMemo } from 'react';
import type { Sneaker, SneakerCategory } from '../types';
import { useStore } from '../context/StoreContext';
import { RankingLinea } from '../components/vitrina/RankingLinea';
import { Carrusel } from '../components/vitrina/Carrusel';

/**
 * Banco de pruebas del rediseño: las piezas nuevas con datos reales, para
 * revisarlas en la vista previa de la rama antes de montarlas en la portada.
 * No la enlaza nadie y se borra cuando el rediseño llegue a las pantallas de
 * verdad. Los rankings de aquí son provisionales: la lista curada a mano llega
 * con la portada.
 */
export function VitrinaMuestraPage() {
  const { sneakers } = useStore();

  const { topOriginales, topSneakers, recientes } = useMemo(() => {
    const porFecha = [...sneakers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const top = (linea: SneakerCategory): Sneaker[] =>
      porFecha
        .filter((s) => s.category === linea && s.status !== 'agotado')
        .slice(0, 5);
    return {
      topOriginales: top('originales'),
      topSneakers: top('general'),
      recientes: porFecha.slice(0, 14),
    };
  }, [sneakers]);

  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-10 sm:py-14 space-y-14">
      <p className="eyebrow">Muestra del rediseño · no es una página publicada</p>

      <div className="grid gap-10 md:grid-cols-2 md:gap-6">
        <RankingLinea titulo="Top Originales" linea="originales" pares={topOriginales} />
        <RankingLinea titulo="Top Sneakers" linea="general" pares={topSneakers} />
      </div>

      <Carrusel titulo="Recién llegados" pares={recientes} />
    </div>
  );
}
