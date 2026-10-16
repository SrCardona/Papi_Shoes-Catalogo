/* Los rankings de la portada. SE EDITA A MANO: es la vitrina del dueño.

   Cada lista va en orden (el primero es el número 1) y lleva el `id` del par,
   el mismo que sale en la dirección de su ficha: /producto/<id>. Cinco por
   línea; si se ponen más, se muestran los cinco primeros que estén a la venta.

   Un par de una lista que se agote, se quite del catálogo o sea de la otra
   línea se salta sin romper nada, y el puesto lo llena el par más reciente de
   esa línea. Así el ranking nunca queda cojo, pero conviene revisar la lista
   cuando se cambia el inventario. */

export const TOP_ORIGINALES: string[] = [
  'sneaker-nike-air-max-dn-triple-black',
  'sneaker-hugo-boss-kai-retro-black',
  'sneaker-calvin-klein-acre-black-white',
  'sneaker-puma-caven-bmw',
  'sneaker-guess-walen',
];

export const TOP_SNEAKERS: string[] = [
  'sneaker-jordan-4-retro-bred',
  'sneaker-nike-dunk-low-panda',
  'sneaker-adidas-samba-og',
  'sneaker-jordan-1-retro-high-chicago',
  'sneaker-louis-vuitton-skate-cuero-azul-royal',
];
