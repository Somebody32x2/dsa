# Static hosting on Coolify (samuelshuster.com/education/dsa). No build step: nginx serves the repo.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
RUN cd /usr/share/nginx/html && rm -rf */tests Dockerfile nginx.conf package.json README.md LICENSE .git* .dockerignore .nojekyll
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
