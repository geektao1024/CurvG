# Local preview renderer for video templates (scripts/render-video-templates.ts
# --docker). Same Manim and fonts as the production renderer image.
FROM manimcommunity/manim:v0.20.1
USER root
RUN apt-get update && apt-get install -y --no-install-recommends fonts-noto-cjk fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
USER manimuser
