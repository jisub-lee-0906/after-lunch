from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
import json
import calendar


@dataclass(frozen=True)
class NationwidePipelineConfig:
    year: int = 2025
    root_dir: Path = Path(__file__).resolve().parent.parent


def build_year_date_bounds(year: int) -> tuple[str, str]:
    return (f"{year}0101", f"{year}1231")


def build_year_month_ranges(year: int) -> list[tuple[str, str]]:
    ranges = []
    for month in range(1, 13):
        last_day = calendar.monthrange(year, month)[1]
        ranges.append((f"{year}{month:02d}01", f"{year}{month:02d}{last_day:02d}"))
    return ranges


def build_stage_paths(root: Path, year: int) -> dict[str, Path]:
    base = root / 'datasets' / str(year)
    return {
        'raw': base / f'raw_meals_{year}.jsonl',
        'refined': base / f'refined_meals_{year}.jsonl',
        'high_confidence': base / f'high_confidence_seed_{year}.json',
        'app_seed': base / f'app_seed_deduped_{year}.json',
        'manifest': base / f'pipeline_manifest_{year}.json',
    }


def build_run_manifest(config: NationwidePipelineConfig, stats: dict[str, int] | None = None) -> dict:
    date_from, date_to = build_year_date_bounds(config.year)
    outputs = {name: str(path) for name, path in build_stage_paths(config.root_dir, config.year).items()}
    return {
        'scope': {
            'year': config.year,
            'date_from': date_from,
            'date_to': date_to,
            'month_ranges': build_year_month_ranges(config.year),
        },
        'outputs': outputs,
        'stats': stats or {},
        'generated_at': date.today().isoformat(),
    }


def write_run_manifest(config: NationwidePipelineConfig, stats: dict[str, int] | None = None) -> Path:
    manifest = build_run_manifest(config, stats)
    path = build_stage_paths(config.root_dir, config.year)['manifest']
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return path
