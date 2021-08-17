FROM node:14
WORKDIR /usr/src/virtual
COPY package*.json ./
COPY . .
ENV NODE_ENV production
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm","run","start:prod"]

