install:
	python -m pip install --upgrade pip
	python -m pip install -r requirements-dev.txt

lint:
	python -m ruff check backend/app backend/tests

typecheck:
	python -m mypy backend/app

test:
	python -m pytest backend/tests

run:
	uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
