---
title: Web panel and RestModule
description: "Install the RestModule, log into the web panel, add users and serve the API over HTTPS."
group: operate
order: 2
---

The web panel manages your network in the browser: servers with their live console, groups, templates, players, wrappers, the server list and modules. It talks to the **RestModule**, an optional module of the master that serves the REST API.

## 1. Install the RestModule

If you answered **yes** to "Install the RestModule?" in the [first-start setup](/docs/installation), it is already installed. Otherwise type this in the master console; it downloads the RestModule in the master's version and loads it right away:

```text
modules install RestModule
```

`modules available` lists every official module and whether it is installed. You can also download the jar into the master's `modules/` folder yourself and load it with `modules load <file>`:

```bash
curl -L -o ~/master/modules/RestModule-{version}.jar https://github.com/rexlCloud/rexlCloud/releases/download/v{version}/restmodule-{version}.jar
```

From now on the master keeps the RestModule up to date by itself, on every start. Official modules that are not installed are never added.

## 2. The admin password

On its first start the RestModule creates the user **admin** with a random password. It is shown once in the master console, never in the log files:

```text
[RestModule] Created user admin with password ...
```

It is also saved in `modules/RestModule/admin-password.txt`, readable only by the user running the master. The file is deleted as soon as the admin changes the password in the panel.

## 3. Log in

Open [web.rexlcloud.de](https://web.rexlcloud.de) and enter:

- **Cloud URL**: the address of your master with port **4343**, e.g. `http://203.0.113.10:4343`, or `https://cloud.example.com:4343` with [HTTPS](#https).
- **Username** `admin` and the password from step 2.

The panel only stores your session; it connects to your cloud's API with the URL you entered. Port 4343 must be reachable from the internet for the hosted panel, so use HTTPS.

## 4. More users

Create users in the panel on the **Users** page, or in the master console with `user create`. Every user gets permissions, for example:

| Permission | Allows |
| --- | --- |
| `SEE_ALL_SERVERS`, `SEE_ALL_GROUPS`, `SEE_PLAYERS`, `SEE_WRAPPERS` | Read-only access to that page |
| `START_SERVER`, `STOP_SERVER`, `EXECUTE_ON_SERVER`, `SEE_SERVER_CONSOLE` | Server control and the live console |
| `MANAGE_GROUPS`, `MANAGE_TEMPLATES` | Creating groups and editing templates |
| `MANAGE_PLAYERS`, `MANAGE_WRAPPERS`, `MANAGE_MAINTENANCE`, `MANAGE_MODULES` | The rest of the network |
| `CREATE_USER`, `DELETE_USER`, `CHANGE_USER_PERMISSIONS`, `SEE_ALL_USERS` | User management |

The admin has every permission.

## HTTPS

The RestModule serves plain HTTP by default. For HTTPS either put a reverse proxy in front of it, or let it serve HTTPS itself.

### Built in

In `modules/RestModule/config.json`:

```json
"tls": {
  "enabled": true,
  "certificate": "/etc/letsencrypt/live/cloud.example.com/fullchain.pem",
  "privateKey": "/etc/letsencrypt/live/cloud.example.com/privkey.pem"
}
```

- The key must be PKCS#8 (`BEGIN PRIVATE KEY`), which certbot writes. Convert others with `openssl pkcs8 -topk8 -nocrypt -in key.pem -out privkey.pem`.
- The user running the master must be able to read both files. certbot's folders are root-only, so copy the files somewhere else in a certbot deploy hook.
- The files are checked every minute; a renewed certificate is used without a restart.
- If HTTPS is enabled and the certificate cannot be loaded, the API does not start at all instead of falling back to HTTP.

### Behind nginx

```nginx
server {
    listen 443 ssl;
    server_name cloud.example.com;
    ssl_certificate     /etc/letsencrypt/live/cloud.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cloud.example.com/privkey.pem;
    client_max_body_size 520m;   # template uploads up to 512 MB

    location / {
        proxy_pass http://127.0.0.1:4343;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # The live console is a WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Then set `host` in `config.json` to `127.0.0.1` so port 4343 is not reachable directly, and log in with `https://cloud.example.com`.

## Prometheus metrics

Set a random `metricsToken` in `modules/RestModule/config.json` to serve metrics at `/api/v2/metrics`: players online, servers per group and state, players per server, and memory, CPU and connection state of every wrapper.

```yaml
scrape_configs:
  - job_name: rexlcloud
    metrics_path: /api/v2/metrics
    authorization:
      credentials: <metricsToken>
    static_configs:
      - targets: ["cloud.example.com:4343"]
```
