#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# HatchAI A2A presence watchdog
#
# Runs from cron (every ~5 min) on the VPS that hosts the okx-a2a daemon.
# Detects when agent #5164's presence goes stale/offline, attempts self-heal
# (re-login + agent refresh + daemon restart), and alerts via Telegram when it
# CAN'T recover on its own (e.g. the OKX API key/trial expired — needs a human).
#
# Sends at most ONE alert per incident, and one "recovered" message when it
# comes back. Config + secrets live in /root/.okx-keys (chmod 600).
#
# Test Telegram delivery:  /root/hatchai-watchdog.sh --test
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

AGENT_ID="5164"
STALE_SECS=300                                   # heartbeat older than this = stale
STATE_FILE="/root/.hatchai-watchdog.state"       # ok | alerted
LOG="/root/hatchai-watchdog.log"
ONCHAINOS="/root/.local/bin/onchainos"

# user-systemd from a root cron needs these
export XDG_RUNTIME_DIR="/run/user/0"
export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/0/bus"
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# secrets + Telegram config (OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE / TG_BOT_TOKEN / TG_CHAT_ID)
# shellcheck disable=SC1091
[ -f /root/.okx-keys ] && . /root/.okx-keys

log(){ echo "$(date -u +'%F %T') $*" >> "$LOG"; }
get_state(){ cat "$STATE_FILE" 2>/dev/null || echo ok; }
set_state(){ echo "$1" > "$STATE_FILE"; }

tg(){
  [ -n "${TG_BOT_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ] || return 0
  curl -s -m 15 "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" \
    --data-urlencode "parse_mode=HTML" \
    --data-urlencode "text=$1" >/dev/null 2>&1
}

# --- self-test hook
if [ "${1:-}" = "--test" ]; then
  tg "🔔 <b>HatchAI watchdog</b> test — Telegram alerts are working."
  echo "test message sent — check Telegram (@mr_network001)"
  exit 0
fi

# --- 1. read current on-chain presence
resp="$($ONCHAINOS agent get-agents --agent-ids "$AGENT_ID" 2>&1)"
online="$(echo "$resp" | grep -o '"onlineStatus":[0-9]*' | grep -o '[0-9]*' | head -1)"
last="$(echo "$resp"   | grep -o '"lastOnlineTime":[0-9]*' | grep -o '[0-9]*' | head -1)"
now_ms=$(( $(date +%s) * 1000 ))
if [ -n "${last:-}" ]; then age=$(( (now_ms - last) / 1000 )); else age=999999; fi

# --- 2. healthy path
if [ "${online:-2}" = "1" ] && [ "$age" -lt "$STALE_SECS" ]; then
  if [ "$(get_state)" = "alerted" ]; then
    tg "✅ <b>HatchAI #${AGENT_ID} recovered</b> — back ONLINE (heartbeat ${age}s ago)."
    log "recovered (age=${age}s)"
  fi
  set_state ok
  exit 0
fi

log "STALE: onlineStatus=${online:-?} age=${age}s — attempting recovery"

# --- 3. self-heal: re-login, then verify auth
login="$($ONCHAINOS wallet login --force 2>&1)"
getres="$($ONCHAINOS agent get --page 1 --page-size 50 2>&1)"

# 3a. hard-stop: credential/billing failure — cannot self-heal, needs a human
if echo "$login $getres" | grep -qiE "trial expired|refresh token error|code=20003|api key"; then
  reason="$(echo "$getres $login" | grep -o 'msg=[^"\\]*' | head -1)"
  if [ "$(get_state)" != "alerted" ]; then
    tg "🔴 <b>HatchAI #${AGENT_ID} is OFFLINE — needs you</b>
Auth failed: <code>${reason:-code=20003}</code>
The OKX API key likely expired. Renew the project key, update /root/.okx-keys if the keys changed, and it self-recovers on the next check.
https://web3.okx.com/onchainos/dev-portal/project"
    set_state alerted
    log "ALERT: auth failure (${reason:-code=20003})"
  fi
  exit 1
fi

# 3b. auth is fine — refresh presence + bounce the daemon
okx-a2a agent refresh >/dev/null 2>&1
systemctl --user restart okx-a2a >/dev/null 2>&1
sleep 45

# --- 4. re-check
resp2="$($ONCHAINOS agent get-agents --agent-ids "$AGENT_ID" 2>&1)"
online2="$(echo "$resp2" | grep -o '"onlineStatus":[0-9]*' | grep -o '[0-9]*' | head -1)"
last2="$(echo "$resp2"   | grep -o '"lastOnlineTime":[0-9]*' | grep -o '[0-9]*' | head -1)"
now2=$(( $(date +%s) * 1000 ))
if [ -n "${last2:-}" ]; then age2=$(( (now2 - last2) / 1000 )); else age2=999999; fi

if [ "${online2:-2}" = "1" ] && [ "$age2" -lt "$STALE_SECS" ]; then
  if [ "$(get_state)" = "alerted" ]; then
    tg "✅ <b>HatchAI #${AGENT_ID}</b> self-healed — back ONLINE."
  fi
  log "self-healed (age=${age2}s)"
  set_state ok
  exit 0
fi

if [ "$(get_state)" != "alerted" ]; then
  tg "🟠 <b>HatchAI #${AGENT_ID} still offline</b> after auto-recovery (age=${age2}s). Manual check needed on the VPS."
  set_state alerted
fi
log "recovery FAILED (age=${age2}s)"
exit 1
