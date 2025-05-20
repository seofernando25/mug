# Troubleshooting 

Common errors and solutions:

## error during connect: this error may indicate that the docker daemon is not running open //./pipe/docker_engine: The system cannot find the file specified.

Make sure you have Docker Desktop up and running.

## SERVER_ERROR:  PostgresError: relation "user" does not exist

Your database is running but you did not update its schema. Make sure to run `bun db:push`

## SERVER_ERROR:  PostgresError: Connection closed

Is your database running? Make sure to run it with `bun docker:up-no-frontend`


