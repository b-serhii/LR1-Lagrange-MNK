# Лабораторна робота № 1 — інтерполяція Лагранжа та МНК

**Виконав:** Бойог Сергій Степанович, ІПЗ-4. **Варіант:** 1.

## Запуск

Вебдодаток написаний на HTML, CSS і JavaScript без npm-залежностей.

```bash
cd LR1_Boioh_Serhii
python3 -m http.server 8000
```

Відкрийте http://localhost:8000/ у браузері. **Не відкривайте index.html напряму через file://** — для ES-модулів потрібен локальний сервер.

### Тестування

Потрібен Node.js 18 або новіший:

```bash
node --test tests/*.test.js
# або
npm test
```

## Основні можливості

- Перемикання між наборами з 5, 10, 20 точок варіанта 1.
- Повна інтерполяція Лагранжа з барицентричними вагами та МНК 1–4 ступенів.
- МНК використовує QR-розкладання Хаусхолдера і масштабовану змінну t=(x−center)/scale. **Нормальні рівняння не використовуються.**
- 6 незалежних графіків (по 2 для кожного набору), великий інтерактивний графік та діаграма залишків.
- Автомасштабування осей за усіма видимими значеннями функцій і точок під час анімації.
- Покрокова поява вузлів Лагранжа, ріст кривої МНК, виведення залишків.
- Валідація введених точок, редагування та скидання, збереження метрик CSV.

## Файли

- `index.html` — розмітка інтерфейсу;
- `src/style.css` — адаптивне оформлення;
- `src/data.js` — вихідні набори варіанта № 1;
- `src/math.js` — перевірка даних, Лагранж, QR-МНК, залишки, метрики;
- `src/chart.js` — шість SVG-графіків, осі, шкали, точки, залишки;
- `src/app.js` — перемикачі, анімація, користувацьке введення;
- `tests/math.test.js` — автоматичні тести;
- `docs/` — блок-схема, діаграма взаємодії та додаткові матеріали.

## Методологія та коміти

Обрано ітераційний Agile-підхід із перевіркою кожного завершеного компонента. Рекомендовані окремі коміти (зробіть їх у власному Git-репозиторії):

```bash
git init
git add README.md package.json index.html
git commit -m "docs: define requirements and create HTML structure"
git add src/data.js src/math.js
git commit -m "feat: implement Lagrange and QR least squares"
git add src/chart.js src/style.css
git commit -m "feat: draw responsive graphs and auto scale axes"
git add src/app.js
git commit -m "feat: add dataset switching and stepwise animations"
git add tests/
git commit -m "test: cover three datasets, numerical stability and validation"
git add docs/
git commit -m "docs: add diagrams and verification artefacts"
```