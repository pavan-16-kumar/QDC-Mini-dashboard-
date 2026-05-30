FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm install --workspaces

COPY . .

RUN npm run build --workspace backend && npm run build --workspace frontend

EXPOSE 3000 3001

CMD ["npm", "run", "dev"]
