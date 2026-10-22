---
title: Betrieb als Linux-Dienst
description: "Master und Wrapper als systemd-Dienste mit tmux-Konsole, Detached Servers und Firewall."
group: operate
order: 1
---

Für ein produktives Netzwerk sollen Master und Wrapper mit der Maschine starten, bei Updates neu starten und ihre Konsole erreichbar halten. Diese Anleitung richtet sie als **systemd**-Dienste ein, die in **tmux** laufen, sodass du dich jederzeit mit der Konsole verbinden kannst. Es ist genau das Setup unseres eigenen Testnetzwerks.

## 1. Ein Benutzer für die Cloud

Spielserver nie als root betreiben:

```bash
sudo apt install tmux git curl
sudo useradd --create-home --shell /bin/bash cloud
sudo -iu cloud
```

## 2. Java 25

Lade ein JDK 25 für Linux x64 von [adoptium.net](https://adoptium.net) herunter und entpacke es in den Home-Ordner:

```bash
mkdir -p ~/jdk-25
curl -L https://api.adoptium.net/v3/binary/latest/25/ga/linux/x64/jdk/hotspot/normal/eclipse | tar -xz --strip-components=1 -C ~/jdk-25
~/jdk-25/bin/java -version
```

Die Wrapper finden Java-Installationen im Home-Ordner automatisch. So können Gruppen zwischen diesem und jedem anderen installierten Java wählen (z. B. Java 21 für alte Minecraft-Versionen).

## 3. Ordner und Startskripte

```bash
mkdir -p ~/master ~/wrapper
curl -L -o ~/master/launcher.jar https://github.com/rexlCloud/rexlCloud/releases/latest/download/launcher.jar
cp ~/master/launcher.jar ~/wrapper/launcher.jar
```

`~/master/start.sh`:

```bash
#!/bin/sh
export PATH=/home/cloud/jdk-25/bin:$PATH
cd /home/cloud/master
exec java -Xms256M -Xmx1G -jar launcher.jar --master
```

`~/wrapper/start.sh` ist gleich, nur mit `wrapper` statt `master`. Beide ausführbar machen: `chmod +x ~/master/start.sh ~/wrapper/start.sh`.

Starte beide einmal von Hand und richte sie wie in der [Installationsanleitung](/docs/installation) ein: Wrapper mit `wrapper add` registrieren, dann beide wieder stoppen (`stop`).

## 4. Detached Servers

Normalerweise sind die Server Kindprozesse des Wrappers und stoppen mit ihm. Mit **Detached Servers** läuft jeder Server in einer eigenen tmux-Sitzung und übersteht Neustarts und Updates des Wrappers. Der Wrapper verbindet sich wieder mit ihnen, wenn er zurückkommt.

In `~/wrapper/config/wrapper.json`:

```json
"detachedServers": true
```

In diesem Modus lässt `detach` (und `systemctl stop`) die Server weiterlaufen; nur `stop` stoppt sie. Ein Server, dessen Wrapper zwei Minuten wegbleibt, fährt sich selbst herunter.

Die Konsole eines Servers direkt ansehen: `tmux -L rexlcloud-2243 ls` (der Socket heißt nach dem `serverPort` des Wrappers).

## 5. systemd-Units

Wieder als root legst du `/etc/systemd/system/rexlcloud-master.service` an:

```ini
[Unit]
Description=rexlCloud master (console: su - cloud -c "tmux -L master attach")
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
User=cloud
WorkingDirectory=/home/cloud/master
ExecStart=/usr/bin/tmux -L master new-session -d -s master -x 200 -y 50 /home/cloud/master/start.sh
ExecStop=/bin/sh -c "tmux -L master send-keys -t master stop Enter; for i in $(seq 1 50); do tmux -L master has-session -t master 2>/dev/null || exit 0; sleep 1; done; tmux -L master kill-session -t master"
TimeoutStopSec=70

[Install]
WantedBy=multi-user.target
```

Und `/etc/systemd/system/rexlcloud-wrapper.service`:

```ini
[Unit]
Description=rexlCloud wrapper (console: su - cloud -c "tmux -L wrapper attach")
After=network-online.target rexlcloud-master.service
Wants=network-online.target

[Service]
Type=forking
User=cloud
WorkingDirectory=/home/cloud/wrapper
ExecStart=/usr/bin/tmux -L wrapper new-session -d -s wrapper -x 200 -y 50 /home/cloud/wrapper/start.sh
ExecStop=/bin/sh -c "tmux -L wrapper send-keys -t wrapper detach Enter; for i in $(seq 1 50); do tmux -L wrapper has-session -t wrapper 2>/dev/null || exit 0; sleep 1; done; tmux -L wrapper kill-session -t wrapper"
TimeoutStopSec=70
# Die Server laufen in eigenen tmux-Sitzungen (detachedServers) und müssen den Wrapper überleben
KillMode=process

[Install]
WantedBy=multi-user.target
```

> **KillMode=process ist wichtig** für Detached Servers. Ohne diese Zeile beendet systemd beim Stoppen des Wrappers jeden Prozess, den der Dienst je gestartet hat, also auch die tmux-Sitzungen der Server. Ohne Detached Servers nimmst du in `ExecStop` `stop` statt `detach`.

Beide aktivieren und starten:

```bash
systemctl daemon-reload
systemctl enable --now rexlcloud-master rexlcloud-wrapper
```

Eine Konsole öffnest du mit `su - cloud -c "tmux -L master attach"` und verlässt sie mit <kbd>Strg</kbd>+<kbd>B</kbd>, <kbd>D</kbd>.

## 6. Updates

`systemctl restart rexlcloud-master` aktualisiert den Master; das Netzwerk läuft weiter, und die Wrapper verbinden sich in Sekunden neu. `systemctl restart rexlcloud-wrapper` aktualisiert einen Wrapper; mit Detached Servers bleiben seine Server online.

## 7. Firewall

| Port | Wer braucht ihn |
| --- | --- |
| ab 25565 | Spieler (Proxys) |
| 1234 | Wrapper auf anderen Maschinen (Master) |
| 4343 | Das Webpanel, wenn du das [RestModule](/docs/web-panel) nutzt |
| ab 25700 | Nur die Proxys; für alle anderen sperren |

Laufen Server und Proxys auf derselben Maschine, sperrst du die Server-Ports von außen so (auch mit `ip6tables`):

```bash
iptables -I INPUT -p tcp --dport 25700:25999 ! -i lo -j DROP
```

Bei Wrappern auf mehreren Maschinen erlaubst du stattdessen die IPs der Proxy-Maschinen, statt alles zu sperren.
