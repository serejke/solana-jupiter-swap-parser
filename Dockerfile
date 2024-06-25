FROM --platform=linux/amd64 node:20.9

RUN mkdir /app

COPY package.json yarn.lock /app

WORKDIR /app

RUN yarn

COPY . /app

RUN yarn build

ENV LANG=C.UTF-8

ENTRYPOINT ["yarn", "start-server"]
