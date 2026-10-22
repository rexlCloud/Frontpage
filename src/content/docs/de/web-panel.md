---
title: Webpanel und RestModule
description: "RestModule installieren, im Webpanel anmelden, Benutzer anlegen und die API über HTTPS anbieten."
group: operate
order: 2
---

Das Webpanel verwaltet dein Netzwerk im Browser: Server mit Live-Konsole, Gruppen, Templates, Spieler, Wrapper, die Serverliste und Module. Es spricht mit dem **RestModule**, einem optionalen Modul des Masters, das die REST-API bereitstellt.

## 1. RestModule installieren

Hast du in der [Einrichtung beim ersten Start](/docs/installation) „Install the RestModule?“ mit **yes** beantwortet, ist es schon installiert. Sonst gibst du in der Konsole des Masters ein; das lädt das RestModule in der Version des Masters herunter und lädt es sofort:

```text
modules install RestModule
```

`modules available` zeigt alle offiziellen Module und ob sie installiert sind. Du kannst die Jar auch selbst in den Ordner `modules/` des Masters laden und mit `modules load <datei>` laden:

```bash
curl -L -o ~/master/modules/RestModule-{version}.jar https://github.com/rexlCloud/rexlCloud/releases/download/v{version}/restmodule.jar
```

Ab jetzt hält der Master das RestModule bei jedem Start selbst aktuell. Offizielle Module, die nicht installiert sind, werden nie hinzugefügt.

## 2. Das Admin-Passwort

Beim ersten Start legt das RestModule den Benutzer **admin** mit einem zufälligen Passwort an. Es wird einmal in der Konsole des Masters angezeigt, nie in den Logdateien:

```text
[RestModule] Created user admin with password ...
```

Außerdem steht es in `modules/RestModule/admin-password.txt`, lesbar nur für den Benutzer, unter dem der Master läuft. Die Datei wird gelöscht, sobald der Admin sein Passwort im Panel ändert.

## 3. Anmelden

Öffne [web.rexlcloud.de](https://web.rexlcloud.de) und gib ein:

- **Cloud-URL**: die Adresse deines Masters mit Port **4343**, z. B. `http://203.0.113.10:4343`, oder `https://cloud.example.com:4343` mit [HTTPS](#https).
- **Benutzername** `admin` und das Passwort aus Schritt 2.

Das Panel speichert nur deine Sitzung; es verbindet sich mit der URL, die du eingibst, mit der API deiner Cloud. Für das gehostete Panel muss Port 4343 aus dem Internet erreichbar sein, also nutze HTTPS.

## 4. Weitere Benutzer

Benutzer legst du im Panel auf der Seite **Users** an oder in der Konsole des Masters mit `user create`. Jeder Benutzer bekommt Rechte, zum Beispiel:

| Recht | Erlaubt |
| --- | --- |
| `SEE_ALL_SERVERS`, `SEE_ALL_GROUPS`, `SEE_PLAYERS`, `SEE_WRAPPERS` | Lesezugriff auf die jeweilige Seite |
| `START_SERVER`, `STOP_SERVER`, `EXECUTE_ON_SERVER`, `SEE_SERVER_CONSOLE` | Server steuern und die Live-Konsole |
| `MANAGE_GROUPS`, `MANAGE_TEMPLATES` | Gruppen anlegen und Templates bearbeiten |
| `MANAGE_PLAYERS`, `MANAGE_WRAPPERS`, `MANAGE_MAINTENANCE`, `MANAGE_MODULES` | Den Rest des Netzwerks |
| `CREATE_USER`, `DELETE_USER`, `CHANGE_USER_PERMISSIONS`, `SEE_ALL_USERS` | Benutzerverwaltung |

Der Admin hat alle Rechte.

## HTTPS

Das RestModule spricht standardmäßig unverschlüsseltes HTTP. Für HTTPS setzt du entweder einen Reverse Proxy davor oder lässt es HTTPS selbst anbieten.

### Eingebaut

In `modules/RestModule/config.json`:

```json
"tls": {
  "enabled": true,
  "certificate": "/etc/letsencrypt/live/cloud.example.com/fullchain.pem",
  "privateKey": "/etc/letsencrypt/live/cloud.example.com/privkey.pem"
}
```

- Der Schlüssel muss im Format PKCS#8 vorliegen (`BEGIN PRIVATE KEY`), wie certbot ihn schreibt. Andere wandelst du mit `openssl pkcs8 -topk8 -nocrypt -in key.pem -out privkey.pem` um.
- Der Benutzer, unter dem der Master läuft, muss beide Dateien lesen können. Die Ordner von certbot sind nur für root lesbar, also kopierst du die Dateien in einem Deploy-Hook von certbot an einen anderen Ort.
- Die Dateien werden jede Minute geprüft; ein erneuertes Zertifikat wird ohne Neustart verwendet.
- Ist HTTPS aktiviert und das Zertifikat nicht ladbar, startet die API gar nicht, statt auf HTTP zurückzufallen.

### Hinter nginx

```nginx
server {
    listen 443 ssl;
    server_name cloud.example.com;
    ssl_certificate     /etc/letsencrypt/live/cloud.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cloud.example.com/privkey.pem;
    client_max_body_size 520m;   # Template-Uploads bis 512 MB

    location / {
        proxy_pass http://127.0.0.1:4343;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Die Live-Konsole ist ein WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Setze dann `host` in `config.json` auf `127.0.0.1`, damit Port 4343 nicht direkt erreichbar ist, und melde dich mit `https://cloud.example.com` an.

## Prometheus-Metriken

Mit einem zufälligen `metricsToken` in `modules/RestModule/config.json` gibt es Metriken unter `/api/v2/metrics`: Spieler online, Server pro Gruppe und Status, Spieler pro Server sowie Speicher, CPU und Verbindungsstatus jedes Wrappers.

```yaml
scrape_configs:
  - job_name: rexlcloud
    metrics_path: /api/v2/metrics
    authorization:
      credentials: <metricsToken>
    static_configs:
      - targets: ["cloud.example.com:4343"]
```
