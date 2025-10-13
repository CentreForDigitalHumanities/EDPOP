FROM python:3.9-bullseye

WORKDIR /usr/src/app/backend
COPY requirements.txt requirements-test.txt .
RUN pip install -U pip pip-tools && \
    pip-sync requirements.txt requirements-test.txt

COPY . .

CMD python manage.py check && \
    python manage.py migrate && \
    python manage.py rdfmigrate && \
    python manage.py runserver 0.0.0.0:8000
