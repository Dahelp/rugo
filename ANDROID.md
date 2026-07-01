# RUGO Android build

Текущий проект - веб-прототип на Three.js. Для быстрой Android-сборки добавлена обвязка Capacitor.

## Первый запуск

1. Установить Node.js и Android Studio.
2. В папке проекта выполнить `npm install`.
3. Выполнить `npm run android:add`.
4. Выполнить `npm run android:sync`.
5. Выполнить `npm run android:open`.

После этого Android Studio откроет проект в папке `android/`, откуда можно собрать APK или запустить игру на устройстве.

## Когда нужен Unity

Capacitor подходит для раннего APK и тестов управления. Если цель - полноценная 3D Android-игра с продакшен-графикой, IAP, оптимизацией и Play Console, следующий крупный этап - перенос логики и данных из `configs/` в Unity URP.
