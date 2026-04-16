# Menggunakan Debian Slim (Lebih stabil untuk Puppeteer/Chromium)
FROM node:18-slim

# Install library pendukung Chromium di Debian
# Kita gunakan apt-get, bukan apk
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcups2 \
    fonts-liberation \
    libegl1 \
    libxshmfence1 \
    ca-certificates \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Lokasi Chromium di Debian berbeda dengan Alpine
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    WEBHOOK_URL=http://localhost:3040/webhook

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

# Tambahkan dumb-init agar proses Chromium tidak jadi zombie
RUN apt-get update && apt-get install -y dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["npm", "start"]