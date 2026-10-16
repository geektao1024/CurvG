FROM docker.io/cloudflare/sandbox:0.12.4-python

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    dvisvgm \
    ffmpeg \
    fonts-dejavu-core \
    fonts-noto-cjk \
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
COPY analyze_contact_sheet.py /opt/curvg/analyze_contact_sheet.py
COPY audio_pipeline.py /opt/curvg/audio_pipeline.py

RUN ffmpeg -v error -f lavfi -i "anullsrc=r=48000:cl=stereo" -t 0.1 \
    -c:a aac -b:a 192k /tmp/curvg-aac-smoke.m4a \
    && test "$(ffprobe -v error -select_streams a:0 \
      -show_entries stream=codec_name,sample_rate,channels \
      -of csv=p=0 /tmp/curvg-aac-smoke.m4a)" = "aac,48000,2" \
    && rm -f /tmp/curvg-aac-smoke.m4a

# Model-authored Manim runs as an unprivileged user. Trusted validators and
# audio tooling stay root-owned/read-only; only the per-job workspace is
# writable. This boundary is required before event audio is considered trusted.
RUN useradd --system --uid 10001 --create-home --home-dir /home/curvg curvg \
    && chown -R curvg:curvg /workspace /home/curvg \
    && chmod -R a-w /opt/curvg \
    && chmod -R a+rX /opt/curvg

USER curvg
WORKDIR /workspace
EXPOSE 8080
