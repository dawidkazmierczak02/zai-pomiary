# ZAI – Serie pomiarowe

Aplikacja internetowa do zbierania i prezentacji wyników pomiarów z czujników IoT.

- `backend/` – REST API (Python, FastAPI, PostgreSQL)
- `generator/` – emulator czujnika wysyłający wyniki do API
- `frontend/` – interfejs użytkownika (React)


## Generator danych - emulator czujnika

Skrypt `generator/generator.py` udaje czujnik: wysyła wyniki do API (`POST /api/measurements`)
z kluczem API czujnika w nagłówku `X-API-Key`. Wymaga tylko Pythona 3.10+ (bez dodatkowych bibliotek).

1. Zaloguj się jako administrator, utwórz serię i zarejestruj czujnik – zapisz zwrócony klucz API
   (jest pokazywany tylko raz).
2. Podaj klucz i adres API:
   ```bash
   export ZAI_SENSOR_KEY='klucz-czujnika'
   export ZAI_API_URL='https://adres-aplikacji'
   ```
3. Uruchom generator:
   ```bash
   # historia: 48 wyników co 30 min, sinusoida w zakresie 55–75
   python generator/generator.py --mode batch --count 48 --step 1800 --shape sine --min 55 --max 75

   # na bieżąco: wynik co 5 s, błądzenie losowe w zakresie 3–5 (zatrzymanie: Ctrl+C)
   python generator/generator.py --mode live --interval 5 --shape walk --min 3 --max 5
   ```

Najważniejsze parametry: `--mode batch|live`, `--shape sine|random|walk`, `--min`/`--max` (zakres
generowanych wartości), `--count` i `--step` (tryb batch), `--interval` (tryb live),
`--invalid-every N` (co N-ty wynik celowo spoza zakresu – pokazuje odrzucenie i log błędów).
Pełna lista: `python generator/generator.py --help`.