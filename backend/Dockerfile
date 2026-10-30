FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY python ./python

RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r ./python/requirements.txt

COPY src ./src

ENV PYTHON_EXECUTABLE=/opt/venv/bin/python

EXPOSE 3000

CMD ["npm", "start"]
