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

## APK

Debug APK собирается командой из папки `android/`:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
.\gradlew.bat assembleDebug --no-daemon
```

Готовый файл:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Ошибка No target device found

Это не ошибка проекта. Android Studio не видит устройство для запуска.

Вариант 1 - эмулятор:

1. В Android Studio открыть `Tools > Device Manager`.
2. Нажать `Create Device`.
3. Выбрать любой телефон, например Pixel.
4. Скачать system image, лучше актуальный Google APIs x86_64.
5. Запустить созданный эмулятор.
6. Снова нажать `Run`.

Вариант 2 - реальный телефон:

1. Включить на телефоне режим разработчика.
2. Включить `USB debugging`.
3. Подключить телефон по USB.
4. Разрешить RSA-ключ на экране телефона.
5. Проверить, что Android Studio показывает телефон в списке устройств.

## Когда нужен Unity

Capacitor подходит для раннего APK и тестов управления. Если цель - полноценная 3D Android-игра с продакшен-графикой, IAP, оптимизацией и Play Console, следующий крупный этап - перенос логики и данных из `configs/` в Unity URP.
