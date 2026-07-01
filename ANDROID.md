# RUGO Android build

Текущий проект - веб-прототип на Three.js. Для быстрой Android-сборки добавлена обвязка Capacitor.

## Первый запуск

1. Установить Node.js и Android Studio.
2. В папке проекта выполнить `pnpm install` или `npm install`.
3. Выполнить `pnpm run android:sync` или `npm run android:sync`.
4. Открыть папку `android/` в Android Studio.
5. Собрать APK через Android Studio или запустить игру на подключенном устройстве.

Папка `android/` уже создана. Скрипт `android:sync` сначала собирает веб-ресурсы в `www/`, затем копирует их в Android-проект.

## Команды

- `pnpm run android:prepare` - подготовить папку `www/`.
- `pnpm run android:sync` - обновить Android-проект после изменений в игре.
- `pnpm run android:open` - открыть Android-проект через Capacitor, если Android Studio доступна в системе.

## Когда нужен Unity

Capacitor подходит для раннего APK и тестов управления. Если цель - полноценная 3D Android-игра с продакшен-графикой, IAP, оптимизацией и Play Console, следующий крупный этап - перенос логики и данных из `configs/` в Unity URP.
