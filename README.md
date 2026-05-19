# Self-Hosted Docker Registry Dashboard

This project runs an authenticated Docker Registry v2 backend with a React dashboard, Node.js API middleware, and Nginx reverse proxy. It is intended for Dokploy Compose app deployments where Dokploy or Traefik terminates TLS outside this stack.

## Environment

Create the environment variables in Dokploy's env tab, or copy `.env.example` to `.env` for local Compose testing:

```bash
REGISTRY_HOSTNAME=registry.yourdomain.com
REGISTRY_USER=admin
REGISTRY_PASSWORD=yourpassword
REGISTRY_HTTP_SECRET=some-long-random-registry-http-secret
JWT_SECRET=some-long-random-secret-at-least-32-characters
NODE_ENV=production
```

Use long random values for `JWT_SECRET` and `REGISTRY_HTTP_SECRET`. The `REGISTRY_USER` and `REGISTRY_PASSWORD` values are used by both the registry htpasswd file and the web UI login.

The `registry-setup` service creates `/auth/htpasswd` the first time the stack boots. If you change registry credentials later, remove the `registry-auth` volume or update the htpasswd file manually before redeploying.

## Deploy On Dokploy

1. Create a new Dokploy Compose app.
2. Point the app at this repository or paste the `docker-compose.yml`.
3. Add the environment variables above in the Dokploy env tab.
4. Deploy the app on a Docker Swarm manager node.
5. Add a domain in the Compose app's Domains tab:
   - Host: your `REGISTRY_HOSTNAME`
   - Service: `nginx`
   - Container Port: `80`
   - Path: `/`
   - HTTPS: enabled for production

The `nginx` service is attached to Dokploy's Traefik network through the external `dokploy-network` network while `registry` and `node-api` remain on the private `registry-net` network. If your Dokploy installation uses a different proxy network name, set:

```bash
DOKPLOY_PROXY_NETWORK=your-dokploy-proxy-network
```

Deploy only `docker-compose.yml` in Dokploy. Do not include `docker-compose.local.yml`; that file is only for local testing.

Do not publish this stack directly on the VPS port `80` in Dokploy. The production `docker-compose.yml` only exposes Nginx internally; Dokploy/Traefik should route the selected domain to the `nginx` service on container port `80`.

All app-to-app traffic stays on the internal `registry-net` network. The registry listens only on `registry:5000`, the API listens only on `node-api:3000`, and Nginx is the only service Dokploy should route to.

Create a DNS `A` record for `REGISTRY_HOSTNAME` pointing to the VPS public IP. Use a root path domain for this registry, not a subpath, because Docker clients expect the Registry API at `/v2/`.

## Docker Login

After the domain is configured and SSL is handled by Dokploy/Traefik:

```bash
docker login registry.yourdomain.com
```

Use `REGISTRY_USER` and `REGISTRY_PASSWORD`.

Push an image:

```bash
docker pull alpine:latest
docker tag alpine:latest registry.yourdomain.com/library/alpine:latest
docker push registry.yourdomain.com/library/alpine:latest
```

Pull it back:

```bash
docker pull registry.yourdomain.com/library/alpine:latest
```

## Dashboard

Open `https://registry.yourdomain.com` and sign in with the same registry credentials. The dashboard supports:

- repository and tag browsing
- manifest metadata, digest, size, and pushed date display
- tag deletion with automatic garbage collection
- manual garbage collection
- retention policy save and cleanup run
- disk usage and registry runtime info
- built-in usage docs for login, push, pull, and Compose image references

## Maintenance Notes

Garbage collection runs inside the `registry` container with:

```bash
registry garbage-collect /etc/docker/registry/config.yml --delete-untagged=true
```

The API serializes tag deletion, cleanup, and GC requests so those tasks do not overlap. Run cleanup and GC during quiet periods because direct Docker clients can still push to `/v2/` while GC is running.

Policy and GC state are stored in the `registry-config` named volume. Image data is stored in `registry-data`.

If `POST /api/cleanup/run` or `POST /api/gc/run` returns `500`, check the `node-api` logs first. The API uses `/var/run/docker.sock` to find the running `registry` container and exec garbage collection. In Swarm/Dokploy, keep `node-api` and `registry` on the same Docker node because Docker exec only works against containers visible on the local Docker socket.

Useful checks on the node running `node-api`:

```bash
docker ps --format 'table {{.Names}}\t{{.Labels}}' | grep registry
docker logs $(docker ps --filter label=com.docker.compose.service=node-api -q | head -n1) --tail=100
```

## Local Checks

Quick local run:

```bash
make dev
```

This creates `.env` from `.env.example` if it does not exist, builds the images, starts the stack, and follows logs.
Only `make dev`, `make dev-config`, and `make dev-down` use `docker-compose.local.yml`, so Nginx is available at `http://localhost` for local testing. Set `LOCAL_HTTP_PORT=8080` in `.env` if port `80` is already busy.

Production-shaped Make targets use only `docker-compose.yml`:

```bash
make config
make build
make up
```

API build check:

```bash
cd api
npm install
npm start
```

UI build check:

```bash
cd ui
npm install
npm run build
```
