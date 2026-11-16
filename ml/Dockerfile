# syntax=docker/dockerfile:1.7
ARG PYTHON_IMAGE=python:3.12.15-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.11.33@sha256:77280f2f771df71f90786c314fe1bbc1e023feac652969bbf139c280babf2eb7

FROM ${UV_IMAGE} AS uv

FROM ${PYTHON_IMAGE}
# libgomp — OpenMP для LightGBM и XGBoost
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* && useradd --create-home --uid 1000 app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/srv/src \
    PIPETWIN_ROOT=/out \
    PIPETWIN_INPUT=/input
WORKDIR /srv
RUN --mount=from=uv,source=/uv,target=/usr/local/bin/uv \
    --mount=type=cache,id=uv,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --locked --no-install-project --no-default-groups
COPY src ./src
COPY warehouse ./warehouse
RUN mkdir -p /out && chown app:app /out
USER app
WORKDIR /out
CMD ["python", "-m", "pipetwin", "--skip-if-ready"]
