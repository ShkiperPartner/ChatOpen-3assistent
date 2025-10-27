# Legacy Documentation Archive

Эта папка содержит старые meta-файлы проекта до миграции на Claude Code Starter framework.

## Дата миграции: 2025-10-27

## Архивированные файлы:

- `PROJECT_ARCHITECTURE.md` - полная архитектура проекта (v1.4)
- `ORIGINAL_REQUIREMENTS.md` - первоначальное ТЗ (ChatGPT clone)
- `README.md` - пользовательская документация

## Что произошло при миграции:

Информация из этих файлов была перенесена в новую структуру:
- `PROJECT_ARCHITECTURE.md` → `Init/ARCHITECTURE.md` + `Init/BACKLOG.md`
- `ORIGINAL_REQUIREMENTS.md` → `Init/PROJECT_INTAKE.md`
- `README.md` → `Init/PROJECT_INTAKE.md`
- Security rules → `Init/SECURITY.md`

## Не удаляйте эти файлы!

Они могут понадобиться для:
- Разрешения конфликтов миграции
- Восстановления информации
- Отката миграции через `/migrate-rollback`

После успешной миграции (через 1-2 спринта) можно безопасно удалить эту папку.

## Backup

Timestamped backup создан в `archive/backup-YYYYMMDD-HHMMSS/`
