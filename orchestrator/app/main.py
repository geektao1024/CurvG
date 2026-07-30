from __future__ import annotations

import hmac
import os

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse

from .models import (
    PrepareRequest,
    PrepareResponse,
    PROTOCOL_VERSION,
    ValidateCodeRequest,
    ValidateCodeResponse,
)
from .service import prepare_animation, validate_animation_code


app = FastAPI(
    title="CurvG Animation Orchestrator",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

MAX_REQUEST_BYTES = 1_000_000


@app.middleware("http")
async def bound_request_body(request, call_next):
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_REQUEST_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Request body is too large"})
    body = await request.body()
    if len(body) > MAX_REQUEST_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Request body is too large"})
    return await call_next(request)


def authorize(authorization: str = Header(default="")) -> None:
    expected = os.environ.get("ORCHESTRATOR_TOKEN", "").strip()
    actual = authorization[7:] if authorization.startswith("Bearer ") else ""
    if not expected or not hmac.compare_digest(actual, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health", dependencies=[Depends(authorize)])
def health() -> dict[str, str]:
    return {"status": "ok", "protocolVersion": PROTOCOL_VERSION}


@app.post(
    "/v1/prepare",
    response_model=PrepareResponse,
    dependencies=[Depends(authorize)],
)
def prepare(request: PrepareRequest) -> PrepareResponse:
    return prepare_animation(request)


@app.post(
    "/v1/validate-code",
    response_model=ValidateCodeResponse,
    dependencies=[Depends(authorize)],
)
def validate_code(request: ValidateCodeRequest) -> ValidateCodeResponse:
    return validate_animation_code(request)
