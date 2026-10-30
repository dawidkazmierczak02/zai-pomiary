from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_JSON = "application/problem+json"

# Typy nagłówka Accept, przy których możemy odpowiedzieć JSON
ACCEPTABLE_MEDIA_TYPES = {"application/json", "application/problem+json", "application/*", "*/*"}

# Błędy walidacji uznawane za składniowe moze to byc zły JSON, brak pola, zły typ 400
SYNTAX_ERROR_TYPES = {"missing", "json_invalid", "extra_forbidden"}
SYNTAX_ERROR_SUFFIXES = ("_type", "_parsing")


class FieldError(BaseModel):
    field: str
    message: str


class ProblemDetail(BaseModel):
    """Opis błędu (RFC 9457) – tylko na potrzeby dokumentacji /docs."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    errors: list[FieldError] | None = None


def problem_responses(*codes: int) -> dict:
    """Opisy kodów błędów do dokumentacji OpenAPI (/docs)."""
    return {code: {"model": ProblemDetail, "description": HTTPStatus(code).phrase} for code in codes}


class ApiError(Exception):
    """Błąd zgłaszany w kodzie endpointów, zwracany jako Problem Details"""

    def __init__(
        self,
        status: int,
        detail: str | None = None,
        errors: list[dict] | None = None,
        headers: dict[str, str] | None = None,
    ):
        self.status = status
        self.detail = detail
        self.errors = errors
        self.headers = headers


def problem_response(
    request: Request,
    status: int,
    detail: str | None = None,
    errors: list[dict] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Buduje odpowiedź błędu zgodną z RFC 9457"""
    body: dict = {
        "type": "about:blank",
        "title": HTTPStatus(status).phrase,
        "status": status,
        "instance": request.url.path,
    }
    if detail:
        body["detail"] = detail
    if errors:
        body["errors"] = errors
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON, headers=headers)


# ---------- Pomocnicze funkcje do negocjacji formatu (406 / 415) ----------

def accepts_json(accept_header: str | None) -> bool:
    if not accept_header:
        return True
    for part in accept_header.split(","):
        media_type, *params = [piece.strip() for piece in part.split(";")]
        quality = 1.0
        for param in params:
            if param.startswith("q="):
                try:
                    quality = float(param[2:])
                except ValueError:
                    quality = 0.0
        if quality > 0 and media_type.lower() in ACCEPTABLE_MEDIA_TYPES:
            return True
    return False


def is_json_content_type(content_type: str) -> bool:
    media_type = content_type.split(";")[0].strip().lower()
    return media_type == "application/json" or media_type.endswith("+json")


def has_body(request: Request) -> bool:
    content_length = request.headers.get("content-length")
    if content_length is not None:
        return content_length.strip() != "0"
    return "transfer-encoding" in request.headers


# ---------- Zamiana błędów walidacji FastAPI na Problem Details ----------

def _field_name(error: dict) -> str:
    """('body', 'minValue') → 'minValue'; dla niepoprawnego JSON-a → 'body'."""
    if error.get("type") == "json_invalid":
        return "body"
    location = [str(part) for part in error.get("loc", ())[1:]]
    return ".".join(location) or str(error.get("loc", ("body",))[0])


def _is_syntax_error(error: dict) -> bool:
    error_type = error.get("type", "")
    return error_type in SYNTAX_ERROR_TYPES or error_type.endswith(SYNTAX_ERROR_SUFFIXES)


def register_error_handlers(app: FastAPI) -> None:
    

    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, exc: ApiError):
        return problem_response(request, exc.status, exc.detail, exc.errors, exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(request: Request, exc: StarletteHTTPException):
        # Np. 404 dla nieistniejącej ścieżki albo 405 dla złej metody
        detail = exc.detail if isinstance(exc.detail, str) else None
        if detail == HTTPStatus(exc.status_code).phrase:
            detail = None
        return problem_response(request, exc.status_code, detail, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        raw_errors = exc.errors()
        errors = [{"field": _field_name(e), "message": e.get("msg", "")} for e in raw_errors]
        sources = {e["loc"][0] for e in raw_errors if e.get("loc")}

        if "path" in sources:
            # Np. /api/series/abc 
            return problem_response(request, 404, "Zasób nie istnieje.")
        if "query" in sources or any(_is_syntax_error(e) for e in raw_errors):
            return problem_response(request, 400, "Niepoprawne żądanie.", errors)
        return problem_response(request, 422, "Dane nie spełniają reguł walidacji.", errors)

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        # Nieprzewidziany błąd 
        return problem_response(request, 500, "Wewnętrzny błąd serwera.")

    @app.middleware("http")
    async def check_media_types(request: Request, call_next):
        if request.url.path.startswith("/api"):
            if not accepts_json(request.headers.get("accept")):
                return problem_response(
                    request, 406, "Serwer zwraca odpowiedzi wyłącznie w formacie JSON."
                )
            if request.method in ("POST", "PUT", "PATCH") and has_body(request):
                if not is_json_content_type(request.headers.get("content-type", "")):
                    return problem_response(
                        request, 415, "Treść żądania musi być w formacie application/json."
                    )
        return await call_next(request)