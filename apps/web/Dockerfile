# For local development via docker-compose only.
# In production, deploy this app to Vercel instead (see root README).
FROM node:20-slim

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
