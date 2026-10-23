from backend.app.schemas.error import ErrorResponse


def test_error_response_model() -> None:
    error = {
        "code": "INVALID_REQUEST",
        "message": "The request is invalid.",
        "request_id": "12345",
    }
    response = ErrorResponse(error=error)
    assert response.error.code == "INVALID_REQUEST"
    assert response.error.request_id == "12345"
