FROM docker.io/cloudflare/sandbox:0.12.4-python

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    dvisvgm \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    pkg-config \
    texlive-fonts-recommended \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-science \
    && CC=gcc CXX=g++ pip3 install --no-cache-dir manim==0.20.1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/local/python/bin:${PATH}"

RUN mkdir -p /opt/curvg /workspace
COPY validate_scene.py /opt/curvg/validate_scene.py

WORKDIR /workspace
EXPOSE 8080
