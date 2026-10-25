# муравей tools (Android) — by Filipp. GORODOT technology

## Сборка APK
1. Установи Android Studio (developer.android.com/studio)
2. File → Open → выбери эту папку, дождись Gradle Sync
3. Подключи телефон (отладка по USB) и нажми ▶ Run
   или: Build → Build Bundle(s) / APK(s) → Build APK(s)
   Готовый файл: app/build/outputs/apk/debug/app-debug.apk
4. Скинь apk на телефон и установи (разреши установку из неизвестных источников)

## Сборка без Android Studio (через GitHub)
1. Создай репозиторий на github.com и загрузи в него всё содержимое этой папки (включая скрытую папку .github)
2. Вкладка Actions → Build APK → дождись зелёной галочки (3–6 минут)
3. Открой запуск → Artifacts → скачай muravey-tools-apk → внутри app-debug.apk
