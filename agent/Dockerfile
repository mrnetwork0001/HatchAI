# HatchAI SafeLaunch ASP (A2MCP agent) — Railway image.
# Debian-slim (glibc) base: the onchainos native binary needs glibc, not musl/alpine.
FROM node:22-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- OKX onchainos CLI (required for the paid launch + settlement path) --------
# onchainos is a proprietary OKX binary (not on npm/apt). Supply the official Linux
# installer URL from the OKX dev portal (https://web3.okx.com/onchain-os/dev-portal)
# as a build arg. If omitted, the image still builds and serves the x402 402
# challenge, but on-chain launch/settlement is unavailable until onchainos exists.
ARG ONCHAINOS_INSTALL_URL=""
RUN if [ -n "$ONCHAINOS_INSTALL_URL" ]; then \
      echo "Installing onchainos from $ONCHAINOS_INSTALL_URL" && \
      curl -fsSL "$ONCHAINOS_INSTALL_URL" | sh && \
      onchainos --version ; \
    else \
      echo "WARN: ONCHAINOS_INSTALL_URL not set — on-chain launch/settlement disabled (402 challenge still works)." ; \
    fi
# Ensure a user-local install location is on PATH (onchainos default is ~/.local/bin).
ENV PATH="/root/.local/bin:${PATH}"

# --- App build ----------------------------------------------------------------
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Railway injects PORT; server.ts reads process.env.PORT (falls back to 3000).
EXPOSE 3000
CMD ["node", "dist/asp/server.js"]
