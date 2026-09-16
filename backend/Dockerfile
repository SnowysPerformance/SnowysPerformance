FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["sh", "-c", "echo '--- ENV VAR NAMES AVAILABLE AT RUNTIME ---' && env | cut -d= -f1 | sort && echo '--- END ---' && npx prisma migrate deploy && npm start"]
