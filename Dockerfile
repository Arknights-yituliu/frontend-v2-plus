FROM almalinux:9
RUN dnf -y upgrade --refresh \
    && dnf -y install nodejs
RUN npm config set registry https://registry.npm.taobao.org
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "run", "server:prod"]
