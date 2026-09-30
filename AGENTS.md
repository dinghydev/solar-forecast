# Agent Instructions

## Before starting

Read [README.md](README.md) first. It covers the project purpose, the
folder structure, local preview and deployment.

## Local server

- Start the local server before doing any work on the site, so changes can
  be checked in the browser as they are made:

  ```bash
  dinghy site start
  ```

  The site is served at http://localhost:3000/.

- If the start fails because port 3000 is already in use, find the process
  holding the port, tell the user what it is, and ask whether to stop it.
  Do not stop it without asking.

  ```bash
  lsof -nP -iTCP:3000 -sTCP:LISTEN
  docker ps --filter publish=3000 --format '{{.ID}} {{.Image}} {{.Names}}'
  ```

- When the work is finished, ask the user whether to stop the local server.
  Do not stop it without asking.

- `dinghy site start` runs the site in a Docker container
  (`dinghydev/dinghy:site-*`). Stopping the `dinghy site start` command may
  leave that container running and holding port 3000. To stop the server
  fully, also stop the container:

  ```bash
  docker ps --filter publish=3000 --format '{{.ID}} {{.Image}}'
  docker stop $(docker ps -q --filter publish=3000)
  ```
