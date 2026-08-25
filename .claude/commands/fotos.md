---
description: Procesa las fotos nuevas de public/catalogo/_entrada/ y las carga al catálogo
---

Procesa las fotos nuevas siguiendo el **PROCEDIMIENTO OBLIGATORIO** de
`CLAUDE.md` › "Procesar fotos nuevas". No te saltes ni reordenes los pasos.

Recordatorio de lo que más se olvida:

1. Recoge a `_entrada/` las fotos sueltas que hayan quedado en
   `public/catalogo/` fuera de `<linea>/<marca>/`.
2. Corre `npm run entrada` **antes de preguntar nada**. Las duplicadas no se
   procesan: se quedan en la bandeja y las borra el dueño.
3. Mira cada foto y propón marca, nombre, colorway y línea. **La horma siempre
   se pregunta.** Si no reconoces la silueta, dilo en vez de inventar.
4. Al acomodar: no sobrescribas un destino que ya exista; avisa y pregunta si
   es otro colorway.
5. El nombre lleva la referencia, no el color (ver "Cómo se nombra un par").
6. Registra en `catalogo/ajustes/<marca>.json`, confirma el precio y corre
   `npm run catalogo`.
7. Informe + commit.

$ARGUMENTS
