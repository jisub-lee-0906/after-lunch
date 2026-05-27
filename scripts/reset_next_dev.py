#!/usr/bin/env python3
from __future__ import annotations

import os
import platform
import shutil
import signal
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
IS_WINDOWS = os.name == 'nt'
NEXT_BIN = PROJECT_ROOT / ('node_modules/.bin/next.cmd' if IS_WINDOWS else 'node_modules/.bin/next')
NEXT_DIR = PROJECT_ROOT / '.next'
HOST = '127.0.0.1'
PORT = 3000
SHUTDOWN_TIMEOUT_SECONDS = 12.0
POLL_INTERVAL_SECONDS = 0.2


@dataclass(frozen=True)
class ProcessInfo:
    pid: int
    ppid: int
    pgid: int
    cwd: str
    command: str


def parse_stat_fields(stat_text: str) -> tuple[int, int]:
    closing_paren_index = stat_text.rfind(')')
    if closing_paren_index == -1:
        raise ValueError('Malformed /proc stat entry')
    trailing_fields = stat_text[closing_paren_index + 2 :].split()
    return int(trailing_fields[1]), int(trailing_fields[2])


def read_process_info(pid: int) -> ProcessInfo | None:
    proc_dir = Path('/proc') / str(pid)
    try:
        stat_text = (proc_dir / 'stat').read_text(encoding='utf-8')
        ppid, pgid = parse_stat_fields(stat_text)
        command = (proc_dir / 'cmdline').read_bytes().replace(b'\x00', b' ').decode('utf-8', 'ignore').strip()
        cwd = os.readlink(proc_dir / 'cwd')
        return ProcessInfo(pid=pid, ppid=ppid, pgid=pgid, cwd=cwd, command=command)
    except (FileNotFoundError, ProcessLookupError, PermissionError, OSError, ValueError):
        return None


def iter_project_next_processes() -> Iterable[ProcessInfo]:
    if IS_WINDOWS:
        return []

    project_root = str(PROJECT_ROOT)
    matches: list[ProcessInfo] = []
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        info = read_process_info(int(entry.name))
        if info is None:
            continue
        if info.cwd != project_root:
            continue
        command = info.command
        if not command or 'reset_next_dev.py' in command:
            continue
        if command.startswith(f'node {NEXT_BIN}') or command.startswith(str(NEXT_BIN)) or command.startswith('next-server (v'):
            matches.append(info)
    return matches


def list_target_groups() -> list[int]:
    if IS_WINDOWS:
        return []
    own_pid = os.getpid()
    own_pgid = os.getpgid(0)
    groups = set()
    for info in iter_project_next_processes():
        if info.pid == own_pid or info.pgid == own_pgid:
            continue
        groups.add(info.pgid)
    return sorted(groups)


def pids_listening_on_port_windows(port: int) -> list[int]:
    cmd = ['netstat', '-ano', '-p', 'tcp']
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    pids: set[int] = set()
    suffix = f':{port}'
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) < 5:
            continue
        local_addr = parts[1]
        state = parts[3].upper()
        pid_text = parts[4]
        if not local_addr.endswith(suffix):
            continue
        if state != 'LISTENING':
            continue
        if pid_text.isdigit():
            pids.add(int(pid_text))
    return sorted(pids)


def is_port_open() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((HOST, PORT)) == 0


def wait_for_process_exit(timeout_seconds: float) -> bool:
    if IS_WINDOWS:
        return True
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if not list(iter_project_next_processes()):
            return True
        time.sleep(POLL_INTERVAL_SECONDS)
    return not list(iter_project_next_processes())


def wait_for_port_release(timeout_seconds: float) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if not is_port_open():
            return True
        time.sleep(POLL_INTERVAL_SECONDS)
    return not is_port_open()


def terminate_existing_groups(sig: int) -> None:
    for pgid in list_target_groups():
        try:
            os.killpg(pgid, sig)
        except ProcessLookupError:
            continue


def terminate_port_owners_windows() -> None:
    for pid in pids_listening_on_port_windows(PORT):
        subprocess.run(['taskkill', '/PID', str(pid), '/T', '/F'], check=False, capture_output=True, text=True)


def clean_next_artifacts() -> None:
    if NEXT_DIR.exists():
        shutil.rmtree(NEXT_DIR)


def start_next_dev() -> None:
    os.chdir(PROJECT_ROOT)
    os.execv(str(NEXT_BIN), [str(NEXT_BIN), 'dev', '--hostname', HOST, '--port', str(PORT)])


def ensure_next_binary_exists() -> None:
    if NEXT_BIN.exists():
        return
    print(f'Missing Next.js binary: {NEXT_BIN}', file=sys.stderr)
    print('Run npm install before using dev:reset.', file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    ensure_next_binary_exists()

    if IS_WINDOWS:
        terminate_port_owners_windows()
        if not wait_for_port_release(SHUTDOWN_TIMEOUT_SECONDS):
            print(f'Port {PORT} is still in use.', file=sys.stderr)
            raise SystemExit(1)
    else:
        terminate_existing_groups(signal.SIGTERM)
        wait_for_process_exit(SHUTDOWN_TIMEOUT_SECONDS)
        wait_for_port_release(SHUTDOWN_TIMEOUT_SECONDS)

        if list(iter_project_next_processes()) or is_port_open():
            terminate_existing_groups(signal.SIGKILL)
            if not wait_for_process_exit(3.0):
                print('Failed to stop existing Next.js processes for this project.', file=sys.stderr)
                raise SystemExit(1)
            if not wait_for_port_release(3.0):
                print(f'Port {PORT} is still in use after killing existing Next.js processes.', file=sys.stderr)
                raise SystemExit(1)

    clean_next_artifacts()
    start_next_dev()


if __name__ == '__main__':
    main()
