#!/bin/zsh
# Wait for collectors to exit, then verify -> qc -> manifest -> stats.
set -u
cd "$(dirname "$0")"
while pgrep -f "collect_(images|videos)" >/dev/null; do sleep 120; done
PY=.venv/bin/python3
$PY -I verify_images.py ../raw work > work/finish-verify.log 2>&1
$PY -I qc_images.py eras.json ../raw work > work/finish-qc.log 2>&1
$PY -I build_manifest.py eras.json ../raw work > work/finish-manifest.log 2>&1
$PY -I report_stats.py eras.json ../raw work > work/finish-stats.txt 2>&1
echo "done $(date -u +%FT%TZ)" > work/finish-done.txt
