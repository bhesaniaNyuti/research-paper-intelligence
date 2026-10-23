import uuid

from fastapi import Request

REQUEST_ID_HEADER = "X-Request-ID"


def get_request_id(request: Request) -> str:
    return request.headers.get(REQUEST_ID_HEADER, str(uuid.uuid4()))
