# REQUIREMENTS MANIFEST: Alarmer v2 Hardening Program

| ID | Requirement | Source (verbatim user answer) | Status | Slice |
|---|---|---|---|---|
| R01 | Вырезать весь мёртвый код (−1098 LOC, −21.7%) | "Вырезать всё мёртвое (−21.7% кода)" | approved | S1 |
| R02 | Один живой ИИ-движок вместо трёх | "Вырезать всё мёртвое" + аудит (ai.ts/aiCompiler.ts/aiAssistant.ts) | approved | S1 |
| R03 | Переехать на нативный Tauri Store (файл в профиле) | "Переехать на нативный Tauri Store (файл)" | approved | S2 |
| R04 | Versioned schema + валидация импорта | "Переехать на нативный Tauri Store (файл)" | approved | S2 |
| R05 | ErrorBoundary на каждый модуль | "ErrorBoundary + линтер + юнит-тесты на ядро" | approved | S3 |
| R06 | ESLint + Prettier | "ErrorBoundary + линтер + юнит-тесты на ядро" | approved | S3 |
| R07 | Юнит-тесты на ядро (парсер ИИ, store, будильники) | "ErrorBoundary + линтер + юнит-тесты на ядро" | approved | S3 |
| R08 | Строгий CSP вместо csp:null | "Включить CSP + сузить capabilities до минимума" | approved | S4 |
| R09 | Сузить capabilities с "*" до минимума | "Включить CSP + сузить capabilities до минимума" | approved | S4 |
| R10 | Кэш аудио в Rust + единый постоянный клиент | "Кэш аудио в Rust + единый постоянный клиент" | approved | S5 |
