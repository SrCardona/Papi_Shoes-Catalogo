/* En el teléfono se esconde la mitad desde CSS (`.luces b:nth-child(n+25)`):
   cuarenta y ocho bombillos en 375 px quedan pegados uno contra otro. */
const BOMBILLOS = 48;

/**
 * Guirnalda de luces bajo la barra, en Navidad.
 *
 * Un cable curvo y bombillos de cuatro colores que titilan desfasados. El color
 * y el desfase salen de `nth-child` en el CSS, no de aquí: así el marcado es
 * una fila de `<b>` vacíos y nada más.
 */
export function Luces() {
  return (
    <div aria-hidden className="luces">
      {Array.from({ length: BOMBILLOS }, (_, i) => (
        <b key={i} />
      ))}
    </div>
  );
}
