# WORD VAULT · Escape Room RPG

Juego de **escape room + rol por equipos** para practicar inglés en la pizarra digital.
**El juego está íntegramente en inglés** (interfaz, historia y preguntas); este README está
en español porque es la guía de uso para clase.

🔗 `https://nuriacalvo-teacher.github.io/escape-room/`

| Fichero | Para qué sirve |
|---|---|
| `index.html` | El juego completo. No hace falta tocarlo. |
| `content.json` | **Contenido nuevo.** Lo que añadas aquí aparece en el juego. |
| `tools/rebuild-content.js` | Regenera el banco de preguntas desde las apps de la web. |

---

## Cómo se juega

De 2 a 6 equipos, **una sola pantalla**, sin móviles ni cuentas. Un jugador de cada equipo
sale a la pizarra por turnos.

1. **Cinco cámaras**, una por destreza: verbos irregulares, tiempos presentes, vocabulario,
   orden de la frase y hábitos (*used to*). El profesor o los propios equipos eligen con
   cuál jugar (modo *Free roam*).
2. Cada acierto **revela una letra de la piedra clave** de la cámara. Al terminar las
   preguntas, cualquier equipo puede escribirla para abrir la puerta (+15 puntos).
   El candado solo da un **acertijo** («Five runes. A verb frozen in the past…»); la
   definición hay que pedirla con *Ask the Guardian* y cuesta 20 segundos de reloj,
   igual que *Reveal a letter* cuesta 30.
3. Con **tres cámaras o más**, el código maestro son las **iniciales** de las piedras clave
   (con las cinco: `WORDS`); con una o dos, la puerta pide **las piedras clave enteras**,
   seguidas. El texto de la puerta lo dice según la partida.
4. **Capa de rol:** cada equipo elige una clase con un poder por cámara (escudo, revelar
   opciones, congelar el reloj, +15 segundos, segunda oportunidad), tiene corazones, gana XP
   y sube de nivel. Los fallos se pueden **robar** (rebote) y las rachas multiplican los puntos.
5. Al final aparece **el Guardián de las Palabras**: preguntas rápidas de todas las cámaras
   que le quitan vida, con golpes críticos si se responde deprisa.
6. **Informe de clase** al terminar: puntos, aciertos, porcentaje por equipo y por cámara,
   y la cámara más floja para repasar. Se puede imprimir.

**Teclado:** `1–4` o `A–D` responder · `Enter` enviar · `Espacio` continuar · `H` usar el poder.

**Sonido:** la música la genera el propio navegador, y **cada cámara tiene su tema**
(acordes, melodía y tempo distintos: 112 a 129 pulsaciones por minuto), así que cambia
cada vez que se abre una puerta. Mientras un equipo piensa la respuesta baja a una
**música de espera** más lenta y sin melodía, para no agobiar; vuelve el ritmo completo
entre pregunta y pregunta, y el Guardián trae su propio tema a 142. También baja de
volumen sola en los dictados. Los botones ♪ y 🔊 de la cabecera apagan música y efectos
por separado.

---

## Añadir contenido nuevo (sin tocar código)

Hay cuatro formas, de la más automática a la más manual:

### 1 · Las chambers se alimentan solas del portal ⭐
Cada vez que se abre el juego **lee `apps.json` del portal** y, de las apps que
tienes publicadas ahí (las que están *visibles*), entra en su página, busca sus
ejercicios y los reparte en la cámara que les toca: verbos, tiempos, vocabulario,
orden de la frase o hábitos.

- Publicas una app nueva en la web → **a la siguiente partida ya hay preguntas suyas**.
- En el apartado *6 · New content* se ve qué apps ha leído y cuántas preguntas ha
  sacado de cada una. El botón **Scan the portal now** fuerza la lectura completa;
  si no, lee unas pocas apps por sesión para no cargar la página.
- Lo leído se guarda en el navegador, así que la segunda vez es instantáneo.
  *Clear what was read* borra esa memoria.

Qué sabe leer y qué no:

| Sí | No |
|---|---|
| Tests con opciones (`q` + `options`, con o sin índice de respuesta) | Preguntas de comprensión que dependen de un texto (se descartan) |
| Huecos con `___` y lista de respuestas | Ejercicios generados al vuelo por la propia app |
| Bancos de frases con el modelo en inglés → orden de palabras | Apps que no guardan los datos en el código (solo HTML suelto) |
| Listas de vocabulario `término + definición en inglés` | |
| Glosarios `inglés + traducción`: se tira la traducción y la palabra inglesa pasa a anagrama, vocales o dictado | |

Dos reglas para mantener el juego **en inglés** y con sentido:
las explicaciones escritas en español no se copian (se enseña solo la respuesta
correcta), y de las apps de *exámenes, reading, listening y speaking* solo se coge
vocabulario, nunca las preguntas sobre un texto que el juego no muestra.

> Solo se leen las apps marcadas como **visibles** en `apps.json`. Ahora mismo lo
> están cinco; las que tengas ocultas no entran hasta que las publiques.

### 2 · Pegar palabras en clase (30 segundos)
En la pantalla de inicio, apartado **6 · New content**, caja *Our own words*:
una palabra por línea, con la pista detrás de una barra vertical.

```
wrist | the part between your arm and your hand
stomach | food goes here after you swallow
*meticulous | careful with every small detail
```

El `*` marca la palabra como **B2** (solo sale en niveles altos). Se guarda en ese ordenador.

### 3 · Subir preguntas a `content.json` (para todo el alumnado)
El juego lee `content.json` **cada vez que se abre**. Edita el fichero en GitHub
(lápiz ✏️ → *Commit changes*) y añade objetos a la lista `items`:

```json
{
  "items": [
    { "r": "vocab", "t": "mcq",
      "q": "Which word means a person who travels to work every day?",
      "o": ["commuter", "customer", "colleague", "coach"],
      "lv": [4, 6], "tip": "A commuter travels between home and work.",
      "sub": "Module 3", "em": "🚆" },

    { "r": "tense", "t": "gap",
      "q": "She ___ in this school since 2019.",
      "a": ["has worked", "has been working"], "hint": "work",
      "lv": [4, 6], "tip": "Since + momento concreto → present perfect.",
      "sub": "Present Perfect", "em": "🧪" }
  ]
}
```

| Campo | Qué es |
|---|---|
| `r` | cámara: `verb`, `tense`, `vocab`, `order`, `habit` |
| `t` | formato: `mcq`, `gap`, `forms`, `order`, `scramble`, `vowels`, `listen` |
| `q` | el enunciado (en los huecos, `___` donde falta la palabra) |
| `o` | opciones del test, **la correcta primero** (se barajan en pantalla) |
| `a` | respuestas válidas de los formatos escritos, p. ej. `["doesn't work","does not work"]` |
| `lv` | niveles que la ven: `[1,6]` = de 1º ESO a 2º Bach |
| `tip` | el comentario que sale tras responder |
| `sub` | pequeño título sobre la pregunta |
| `em` | un emoji |

Al abrir el juego aparece **“N extra questions loaded”** en el apartado 6.

### 4 · Cargar preguntas desde otra dirección
En el mismo apartado, *Question file from an address*: pega la URL de cualquier JSON con esa
misma estructura (por ejemplo, un `content.json` de otro repositorio) y pulsa **Add**.
Se recuerda solo en ese ordenador; *Forget sources* lo borra.

---

## Regenerar el banco desde las apps de la web

Las 800 preguntas que trae el juego salen de las apps destacadas del portal
(`irregular-verbs`, `present-tenses`, `battles`, `sentence-formation`, `habits`).
Si esas apps crecen, se puede regenerar el banco:

```bash
cd tools
git clone --depth 1 https://github.com/nuriacalvo-teacher/irregular-verbs
git clone --depth 1 https://github.com/nuriacalvo-teacher/present-tenses
git clone --depth 1 https://github.com/nuriacalvo-teacher/battles
git clone --depth 1 https://github.com/nuriacalvo-teacher/sentence-formation
git clone --depth 1 https://github.com/nuriacalvo-teacher/habits
node rebuild-content.js      # escribe content.json
```

Sube ese `content.json` al repositorio y el juego lo carga solo.

---

## Publicarlo en el portal

Para que salga en `nuriacalvo-teacher.github.io`, añade esta entrada a `apps.json`
del repositorio del portal:

```json
{
  "id": "word-vault",
  "repo": "escape-room",
  "url": "https://nuriacalvo-teacher.github.io/escape-room/",
  "title": "Word Vault",
  "subtitle": "Escape room por equipos",
  "description": "Escape room y juego de rol por equipos: cinco cámaras de verbos irregulares, tiempos presentes, vocabulario, orden de la frase y hábitos, con piedras clave, poderes y jefe final.",
  "category": "grammar",
  "levels": ["2º ESO", "3º ESO", "4º ESO", "1º Bach", "2º Bach"],
  "tags": ["Escape room", "Por equipos", "Pizarra digital"],
  "icon": "fa-dungeon",
  "accent": "amber",
  "status": "live",
  "featured": true,
  "visible": true
}
```

---

Sin cuentas, sin servidor y sin datos guardados fuera del navegador. Necesita internet
para cargar Tailwind, Font Awesome y la tipografía, igual que el resto de las apps.
