#!/usr/bin/env bash
# Script auxiliar para descriptografar secrets.enc.yaml usando SOPS + age
# Uso (local): export SOPS_AGE_KEY="<conteúdo_da_chave_privada_age>"; ./tools/sops-decrypt.sh
# Uso (CI): configure a variável de ambiente SOPS_AGE_KEY com o conteúdo da chave privada e execute este script
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENC_FILE="$REPO_ROOT/secrets.enc.yaml"
OUT_FILE="$REPO_ROOT/secrets.yaml"

if [[ ! -f "$ENC_FILE" ]]; then
  echo "Encrypted secrets file not found at $ENC_FILE"
  exit 1
fi

if [[ -z "${SOPS_AGE_KEY:-}" && -z "${SOPS_AGE_KEY_FILE:-}" ]]; then
  echo "Provide SOPS_AGE_KEY (contents) or SOPS_AGE_KEY_FILE (path to private key)"
  exit 2
fi

TMP_KEY_FILE=""
if [[ -n "${SOPS_AGE_KEY_FILE:-}" ]]; then
  TMP_KEY_FILE="$SOPS_AGE_KEY_FILE"
else
  TMP_KEY_FILE="$(mktemp)"
  printf "%s" "$SOPS_AGE_KEY" > "$TMP_KEY_FILE"
  chmod 600 "$TMP_KEY_FILE"
fi

# sops supports --age-file to point to a private key file
sops --decrypt --age-file "$TMP_KEY_FILE" "$ENC_FILE" > "$OUT_FILE"

echo "Decrypted to $OUT_FILE"

# clean up temporary key file if we created it
if [[ -z "${SOPS_AGE_KEY_FILE:-}" ]]; then
  shred -u "$TMP_KEY_FILE" 2>/dev/null || rm -f "$TMP_KEY_FILE"
fi

exit 0
