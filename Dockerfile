FROM nginx:stable-alpine
COPY index.html style.css script.js duck.js avatar.png channel-avatar.png robots.txt sitemap.xml /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY stickers_json/ /usr/share/nginx/html/stickers_json/
EXPOSE 80
