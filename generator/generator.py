"""Emulator czujnika (F13) – wysyła wyniki pomiarów do API projektu ZAI.

Tryby:
  batch – jednorazowo wysyła historię wyników z przeszłości (dane przykładowe, F11),
  live  – wysyła nowy wynik co --interval sekund, aż do Ctrl+C

Przykłady:
  python generator.py --key KLUCZ --mode batch --count 48 --step 1800 --shape sine --min 55 --max 75
  python generator.py --key KLUCZ --mode live --interval 5 --shape walk --min 3 --max 5

Klucz API można też podać w zmiennej środowiskowej ZAI_SENSOR_KEY,
a adres API w ZAI_API_URL.
"""

import argparse
import json
import math
import os
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

SHAPES = ("sine", "random", "walk")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Emulator czujnika – wysyła wyniki do API ZAI.")
    parser.add_argument("--api", default=os.environ.get("ZAI_API_URL", "http://127.0.0.1:8000"),
                        help="adres aplikacji (domyślnie ZAI_API_URL lub http://127.0.0.1:8000)")
    parser.add_argument("--key", default=os.environ.get("ZAI_SENSOR_KEY"),
                        help="klucz API czujnika (domyślnie ZAI_SENSOR_KEY)")
    parser.add_argument("--mode", choices=("batch", "live"), default="batch",
                        help="batch = historia z przeszłości, live = wysyłanie na bieżąco")
    parser.add_argument("--shape", choices=SHAPES, default="sine",
                        help="kształt przebiegu: sine (sinusoida), random (losowy), walk (błądzenie losowe)")
    parser.add_argument("--min", type=float, default=0.0, dest="low", help="dolna granica generowanych wartości")
    parser.add_argument("--max", type=float, default=100.0, dest="high", help="górna granica generowanych wartości")
    parser.add_argument("--noise", type=float, default=0.02,
                        help="szum jako ułamek zakresu, np. 0.02 = 2%% (domyślnie 0.02)")
    parser.add_argument("--period", type=int, default=24,
                        help="liczba punktów na pełny okres sinusoidy (domyślnie 24)")
    parser.add_argument("--count", type=int, default=30, help="batch: liczba wyników (domyślnie 30)")
    parser.add_argument("--step", type=int, default=3600,
                        help="batch: odstęp między wynikami w sekundach (domyślnie 3600 = 1 h)")
    parser.add_argument("--interval", type=float, default=5.0,
                        help="live: co ile sekund wysyłać wynik (domyślnie 5)")
    parser.add_argument("--invalid-every", type=int, default=0,
                        help="co który wynik wysłać wartość spoza zakresu (demo odrzucenia, 0 = nigdy)")
    parser.add_argument("--invalid-value", type=float, default=99999.0,
                        help="wartość wysyłana przy --invalid-every (domyślnie 99999 – spoza każdej rozsądnej serii)")
    parser.add_argument("--seed", type=int, help="ziarno losowania – te same dane przy każdym uruchomieniu")
    args = parser.parse_args()

    if not args.key:
        parser.error("podaj klucz API czujnika: --key KLUCZ albo zmienną ZAI_SENSOR_KEY")
    if args.low >= args.high:
        parser.error("--min musi być mniejsze niż --max")
    if args.count < 1 or args.step < 1 or args.interval <= 0 or args.period < 2:
        parser.error("--count, --step, --interval i --period muszą być dodatnie (--period co najmniej 2)")
    return args


class ValueSource:
    """Wylicza kolejne wartości wybranego kształtu w przedziale [low, high]."""

    def __init__(self, shape: str, low: float, high: float, noise: float, period: int):
        self.shape, self.low, self.high, self.period = shape, low, high, period
        self.span = high - low
        self.noise = noise * self.span
        self.current = (low + high) / 2  # punkt startowy błądzenia losowego

    def value(self, index: int) -> float:
        if self.shape == "sine":
            middle, amplitude = (self.low + self.high) / 2, self.span / 2 * 0.8
            raw = middle + amplitude * math.sin(2 * math.pi * index / self.period)
            raw += random.uniform(-self.noise, self.noise)
        elif self.shape == "random":
            raw = random.uniform(self.low, self.high)
        else:  # walk  każda wartość to poprzednia +/- niewielka zmiana
            self.current += random.uniform(-0.05, 0.05) * self.span
            raw = self.current
        clamped = min(max(raw, self.low), self.high)
        if self.shape == "walk":
            self.current = clamped
        return round(clamped, 2)


def send(api: str, key: str, value: float, timestamp: datetime | None) -> tuple[int, dict]:
    """Wysyła jeden wynik. Zwraca (kod HTTP, treść odpowiedzi)."""
    payload = {"value": value}
    if timestamp is not None:
        payload["timestamp"] = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    request = urllib.request.Request(
        api.rstrip("/") + "/api/measurements",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json", "X-API-Key": key},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read() or b"{}")
    except urllib.error.HTTPError as error:  # 4xx/5xx serwer odpowiedział błędem
        try:
            body = json.loads(error.read() or b"{}")
        except json.JSONDecodeError:
            body = {}
        return error.code, body


def report(index: int, total: int | None, value: float, status: int, body: dict) -> bool:
    """Wypisuje wynik wysyłki. Zwraca True, jeśli wynik został zapisany."""
    position = f"[{index}/{total}]" if total else f"[{index}]"
    if status == 201:
        print(f"{position} OK       {value:>10}  {body.get('timestamp', '')}")
        return True
    detail = body.get("detail") or body.get("title") or "nieznany błąd"
    label = "ODRZUCONO" if status == 422 else f"BŁĄD {status}"
    print(f"{position} {label:<9}{value:>10}  {detail}")
    if status == 401:
        print("Klucz API jest nieprawidłowy albo czujnik został wyrejestrowany – przerywam.", file=sys.stderr)
        sys.exit(1)
    return False


def pick_value(source: ValueSource, index: int, args: argparse.Namespace) -> float:
    """Kolejna wartość; co --invalid-every wynik celowo spoza zakresu serii (demo F4)."""
    if args.invalid_every and index % args.invalid_every == 0:
        return args.invalid_value
    return source.value(index)


def run_batch(args: argparse.Namespace, source: ValueSource) -> int:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    start = now - timedelta(seconds=args.step * args.count)
    saved = 0
    for i in range(1, args.count + 1):
        value = pick_value(source, i, args)
        status, body = send(args.api, args.key, value, start + timedelta(seconds=args.step * i))
        saved += report(i, args.count, value, status, body)
    print(f"\nZapisano {saved} z {args.count} wyników.")
    return saved


def run_live(args: argparse.Namespace, source: ValueSource) -> None:
    print(f"Wysyłam wynik co {args.interval} s. Zatrzymanie: Ctrl+C.\n")
    i = 0
    try:
        while True:
            i += 1
            value = pick_value(source, i, args)
            status, body = send(args.api, args.key, value, None)  # brak timestamp = czas serwera
            report(i, None, value, status, body)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print(f"\nZatrzymano po {i} wysyłkach.")


def main() -> None:
    args = parse_args()
    if args.seed is not None:
        random.seed(args.seed)
    source = ValueSource(args.shape, args.low, args.high, args.noise, args.period)
    print(f"API: {args.api}  tryb: {args.mode}  kształt: {args.shape}  zakres: [{args.low}, {args.high}]")
    try:
        if args.mode == "batch":
            run_batch(args, source)
        else:
            run_live(args, source)
    except urllib.error.URLError as error:
        print(f"\nNie można połączyć się z API ({args.api}): {error.reason}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()