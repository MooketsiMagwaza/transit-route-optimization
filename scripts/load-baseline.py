"""Measure real latency, throughput, and errors for the public API, using only the standard library.

    python scripts/load-baseline.py --url http://localhost:8000 --key $TSELA_API_KEY \
        --concurrency 8 --seconds 30

Use a dedicated key with a raised hourly limit; the default limit of 100 per hour will (correctly)
start returning 429 almost immediately, and that is reported separately from real errors. The
result is written to ops/backups/evidence/ so the capacity document cites measurements, not guesses.
"""

from __future__ import annotations

import argparse
import json
import statistics
import threading
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path


def percentile(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(fraction * len(ordered)))]


def worker(url: str, key: str, deadline: float, results: list[tuple[int, float]], lock: threading.Lock) -> None:
    request = urllib.request.Request(url, headers={"X-API-Key": key, "Accept": "application/json"})
    while time.monotonic() < deadline:
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                response.read()
                status = response.status
        except urllib.error.HTTPError as error:
            status = error.code
        except Exception:  # noqa: BLE001 - a network failure is a measurement, not a crash
            status = 0
        elapsed = (time.perf_counter() - started) * 1000
        with lock:
            results.append((status, elapsed))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--path", default="/v1/routes?limit=50")
    parser.add_argument("--key", required=True)
    parser.add_argument("--concurrency", type=int, default=8)
    parser.add_argument("--seconds", type=int, default=30)
    args = parser.parse_args()

    results: list[tuple[int, float]] = []
    lock = threading.Lock()
    deadline = time.monotonic() + args.seconds
    started = time.monotonic()
    threads = [
        threading.Thread(target=worker, args=(args.url + args.path, args.key, deadline, results, lock))
        for _ in range(args.concurrency)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    elapsed = time.monotonic() - started

    ok = [ms for status, ms in results if status == 200]
    limited = sum(1 for status, _ in results if status == 429)
    errors = sum(1 for status, _ in results if status == 0 or status >= 500)
    summary = {
        "measuredAt": datetime.now(UTC).isoformat(),
        "target": args.url + args.path,
        "concurrency": args.concurrency,
        "durationSeconds": round(elapsed, 1),
        "requests": len(results),
        "requestsPerSecond": round(len(results) / elapsed, 1),
        "ok": len(ok),
        "rateLimited429": limited,
        "serverErrorsOrNetworkFailures": errors,
        "latencyMs": {
            "p50": round(percentile(ok, 0.50), 1),
            "p95": round(percentile(ok, 0.95), 1),
            "p99": round(percentile(ok, 0.99), 1),
            "mean": round(statistics.fmean(ok), 1) if ok else 0,
        },
    }
    print(json.dumps(summary, indent=2))
    out = Path(__file__).resolve().parents[1] / "ops" / "backups" / "evidence"
    out.mkdir(parents=True, exist_ok=True)
    (out / f"capacity-{datetime.now(UTC):%Y%m%dT%H%M%SZ}.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
