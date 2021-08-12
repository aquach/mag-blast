FROM node:14
WORKDIR /usr/src/virtual
COPY package*.json ./
RUN npm install
RUN npm run build
COPY . .
EXPOSE 3000
CMD ["npm","run","start:prod"]

