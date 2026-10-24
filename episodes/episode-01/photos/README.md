# Episode 1 «Arrival» — фото для сцен

Епізод уже повністю працює на намальованих SVG-сценах. Щойно ти покладеш у цю папку (`episodes/episode-01/photos/`) файл із точною назвою з таблиці, епізод **сам** почне показувати фото замість малюнка — код міняти не треба.

**Формат для всіх:** WebP, 1920×1080 (16:9), 200–400 КБ.

**Композиція:** нижні ~30% кадру частково закриває панель діалогу. Тому головне (обличчя, табличка, місто за вікном) тримай у верхніх двох третинах.

**Стиль для всіх промптів:** додавай у кінці кожного:

> photorealistic, cinematic film still, 35mm, shallow depth of field, warm Californian golden-hour color grade, rich but natural colors, contemporary, no text artifacts, no logos, no watermark, 16:9

**Важливо про героя:** гравець — це сам учень. Усе знято **від першої особи**, обличчя героя ніде не показуємо.

| Файл | Сцена | Промпт |
|---|---|---|
| `s1-cabin.webp` | 1 · салон літака | Interior of a modern passenger airplane cabin just after landing, view from a window seat looking down the aisle, warm golden late-afternoon sunlight streaming through the oval windows, passengers' heads silhouetted, seat-belt sign glowing |
| `s1-window.webp` | 1 · вид з ілюмінатора | First-person view through an airplane window during final approach to Los Angeles at golden hour, downtown LA skyline and palm-lined streets below, sun low on the horizon, a bit of the wing visible, window frame in the edges of the shot |
| `s2-terminal.webp` | 2 · коридор терміналу | First-person view walking through a bright modern airport arrivals corridor at sunset, huge glass walls, palm trees and planes outside, overhead signs "Arrivals · Passport Control", travelers with suitcases slightly blurred |
| `s3-passport-control.webp` | 3 · паспортний контроль | First-person view at an airport immigration booth, a friendly professional officer in a dark navy uniform behind the glass counter looking at the camera with a polite smile, queue belts, overhead sign "Passport Control", cool fluorescent light mixed with warm evening light |
| `s4-baggage-claim.webp` | 4 · видача багажу | Wide first-person view of an airport baggage claim hall, a long luggage carousel in the lower half of the frame (empty belt, no suitcases), big sign "Baggage Claim 4" above, evening light |
| `s5-baggage-service.webp` | 5 · стійка багажної служби | First-person view of an airport baggage service desk, a friendly airport employee in a green vest with a lanyard behind the counter, shelves of lost suitcases behind her, sign "Baggage Service — Lost & Delayed Bags" |
| `s5-carousel-6.webp` | 5 · стрічка 6 | Airport baggage claim hall, a luggage carousel in the lower half of the frame (empty belt, no suitcases), big sign "Baggage Claim 6", slightly quieter and darker than carousel 4 |
| `s6-pickup-zone.webp` | 6 · зона посадки | First-person view stepping outside an LA airport terminal into the ground transportation pickup zone at early evening, purple-orange sky, palm trees, cars with headlights at the curb, green sign "Ground Transportation · Doors 3–6", a coffee stand near "Door 5" |
| `s6-chris-van.webp` | 6 · Кріс біля мінівена | At the airport pickup curb at dusk, a friendly man in his 30s in casual clothes standing next to a silver minivan, holding a white sign that reads "LA EXCHANGE — WELCOME", smiling at the camera, palm trees behind |
| `s7-drive.webp` | 7 · у машині | First-person view from the passenger seat of a car looking through the side window at a Los Angeles street at sunset, palm trees, billboards, downtown skyline in the distance, the first city lights turning on, soft reflections on the glass |
| `s8-hotel-room.webp` | 8 · готельний номер | Cozy modern hotel room at night, first-person view from near the door, warm bedside lamp, a black medium suitcase with an orange ribbon on the handle near the bed, large window with Los Angeles city lights glittering outside |

## Примітки

- **Валізи в міні-іграх** (стрічка, вибір валізи) лишаються намальованими. Там важливо, щоб розмір, колір і стрічка точно відповідали завданню.
- **Точки для дослідження** (пульсуючі кружечки) розставлені під SVG-сцени. Якщо на фото табличка чи вікно в іншому місці, підправ `x` / `y` (у відсотках) у блоці `hotspots` потрібної сцени в `episodes/episode-01/episode-01.js`.
- **Наявне фото `arrival`** (сцена 2 і спогад «First Steps in LA») — на ньому **американський паспорт**. Герой у нас з України, тож при нагоді варто замінити на фото з українським паспортом.
