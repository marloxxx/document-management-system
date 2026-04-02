# syntax=docker/dockerfile:1

FROM php:8.4-cli-alpine AS vendor

WORKDIR /app

COPY --from=composer:2.8.12 /usr/bin/composer /usr/bin/composer

RUN apk add --no-cache \
    icu-dev \
    libzip-dev \
    libxml2-dev \
    oniguruma-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    libwebp-dev \
    $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
    bcmath \
    exif \
    gd \
    intl \
    pdo_mysql \
    zip \
    dom \
    simplexml \
    xml \
    xmlreader \
    xmlwriter \
    && apk del $PHPIZE_DEPS

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader \
    --no-scripts

COPY . .
RUN composer dump-autoload --optimize --no-dev

FROM node:22-alpine AS assets

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY resources ./resources
COPY public ./public
COPY vite.config.js vite.config.js
COPY postcss.config.mjs postcss.config.mjs
COPY tsconfig.json tsconfig.json
RUN npm run build

FROM webdevops/php-nginx:8.4-alpine

# Vendor stage does not ship PHP extensions into this image; add runtime deps for Postgres/Redis/queue.
RUN apk add --no-cache \
    postgresql-dev \
    $PHPIZE_DEPS \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS postgresql-dev \
    && apk add --no-cache postgresql-libs

WORKDIR /app

ENV WEB_DOCUMENT_ROOT=/app/public
ENV PHP_MEMORY_LIMIT=512M
ENV PHP_POST_MAX_SIZE=64M
ENV PHP_UPLOAD_MAX_FILESIZE=64M

COPY --from=vendor --chown=application:application /app /app
COPY --from=assets --chown=application:application /app/public/build /app/public/build

RUN mkdir -p /app/storage/logs /app/bootstrap/cache \
    && chown -R application:application /app/storage /app/bootstrap/cache

EXPOSE 80
