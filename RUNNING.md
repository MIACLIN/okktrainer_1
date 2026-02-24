Запуск проекта с Docker Compose
================================

1) Убедитесь, что в корне репозитория лежит `docker-compose.yml` (добавлен).

2) Положите файл модели Piper, если планируете локальный TTS:

  ./okktrainer/ai/models/piper/en_US-ryan-high.onnx

   Если модель отсутствует, контейнер `ai` запустится, но TTS не будет работать.

3) Запуск сборки и поднятие сервисов:

```bash
# в корне репозитория
docker compose up --build
```

Альтернативно (если у вас старая версия):

```bash
docker-compose up --build
```

4) Полезные примечания:

- `web` использует `LIVEKIT_URL=ws://livekit:7880` для сервер-серверного соединения и `NEXT_PUBLIC_LIVEKIT_URL` для браузера.
- `ollama` по умолчанию слушает на `11434`; в `ai` указан `OLLAMA_BASE_URL=http://ollama:11434/v1`.
- Если вы не хотите публиковать `ollama` наружу, удалите порт `11434:11434` из `docker-compose.yml`.

5) Проверка и отладка:

- Логи контейнеров: `docker compose logs -f` или `docker compose logs -f ai`.
- Остановить: `docker compose down`.
