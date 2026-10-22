---
title: Installation
description: "Vom leeren Server zu laufendem Master und Wrapper in etwa fünf Minuten."
group: start
order: 1
---

rexlCloud besteht aus zwei Programmen, die der **Launcher** startet und aktuell hält:

- der **Master** hält die Konfiguration, die Templates und die Datenbank und entscheidet, wo Server laufen. Du brauchst genau einen.
- ein **Wrapper** läuft auf jeder Maschine, die Server betreiben soll. Er startet sie, synchronisiert die Templates und meldet Speicher und CPU an den Master.

Master und Wrapper können auf derselben Maschine laufen. So fängt man am einfachsten an, und genau das macht diese Anleitung.

## Voraussetzungen

- **Java 25** für Master und Wrapper. Prüfen mit `java -version`.
- **Java 21 oder neuer** für die Minecraft-Server (das gleiche Java 25 funktioniert für aktuelle Versionen).
- Linux wird empfohlen. Windows funktioniert auch, praktisch zum Testen.
- Mindestens 2 GB freier Arbeitsspeicher plus den Speicher der Server, die laufen sollen.
- Optional: `git`, wenn du Spigot nutzen willst (es wird beim ersten Mal mit BuildTools gebaut), `tmux` für [Detached Servers](/docs/linux-service).

> Unter Debian oder Ubuntu ohne Java 25 lädst du ein JDK von [adoptium.net](https://adoptium.net) herunter und entpackst es, z. B. nach `/opt/jdk-25`. Die [Anleitung zum Linux-Dienst](/docs/linux-service) zeigt die komplette Einrichtung mit eigenem Benutzer.

## 1. Launcher herunterladen

Lege einen Ordner für den Master und einen für den Wrapper an und kopiere den Launcher in beide:

```bash
mkdir -p ~/rexlcloud/master ~/rexlcloud/wrapper
cd ~/rexlcloud
curl -L -o master/launcher.jar https://github.com/rexlCloud/rexlCloud/releases/latest/download/launcher.jar
cp master/launcher.jar wrapper/launcher.jar
```

Du bekommst ihn auch auf der [Download-Seite](/download).

## 2. Master starten

```bash
cd ~/rexlcloud/master
java -Xms256M -Xmx1G -jar launcher.jar --master
```

Ohne `--master` fragt der Launcher, ob Master oder Wrapper starten soll. Beim ersten Start lädt er den Master herunter, der dann ein paar Fragen stellt. <kbd>Enter</kbd> übernimmt den Vorschlag in Klammern, <kbd>Tab</kbd> zeigt die Auswahl:

```text
Port the wrappers connect to [1234]:
Which proxy software will your network use? (velocity, bungeecord) [velocity]:
Which database should the cloud use? (h2, mysql, mariadb) [h2]:
Install the RestModule? (yes, no) [yes]:
```

- **Proxy-Software**: Empfohlen ist Velocity. BungeeCord stellt die Cloud auf Legacy Forwarding um (siehe [Dein erstes Netzwerk](/docs/first-network#spieler-forwarding)).
- **Datenbank**: `h2` ist eingebaut und braucht nichts weiter. Bei `mysql` oder `mariadb` fragt der Master Host, Port, Datenbank, Benutzer und Passwort ab, testet die Verbindung sofort und legt die Datenbank an, wenn der Benutzer das darf. Klappt es nicht, kannst du es erneut versuchen, die Angaben ändern oder H2 nehmen. Siehe [Datenbank](/docs/database).
- **Module**: Das RestModule ist die REST-API für das [Webpanel](/docs/web-panel). Überspringst du es jetzt, installierst du es später mit `modules install RestModule`.

<kbd>Strg</kbd>+<kbd>C</kbd> bricht ab, ohne etwas zu speichern; beim nächsten Start kommen die Fragen erneut. Alles lässt sich später in `config/` ändern.

Danach legt der Master an:

| Ordner | Inhalt |
| --- | --- |
| `config/` | `master.json` (Port, Wartung, Forwarding), `database.json`, `messages.json`, `groups.json`, `wrappers.json`, `tls/` |
| `templates/` | Die Templates deiner Gruppen und die globalen Templates |
| `database/` | Die eingebaute H2-Datenbank |
| `modules/` | Module wie das RestModule für das Webpanel |

Die Konsole zeigt den **TLS-Fingerprint** des Masters (`TLS fingerprint of the master: ...`). Halte ihn für Schritt 4 bereit.

Der Master wartet auf dem Port aus der Einrichtung auf Wrapper, standardmäßig **1234** (`port` in `config/master.json`). Nur deine Wrapper müssen ihn erreichen; für alle anderen sperren.

## 3. Wrapper starten

Öffne ein zweites Terminal (oder nutze `tmux`/`screen`):

```bash
cd ~/rexlcloud/wrapper
java -Xms256M -Xmx1G -jar launcher.jar --wrapper
```

Beim ersten Start erzeugt der Wrapper einen Schlüssel und gibt den Befehl aus, mit dem er registriert wird:

```text
No auth key found, creating a new one!
Register the wrapper on the master with this command: "wrapper add 127.0.0.1 6f1c...-...-..."
```

Der Wrapper verbindet sich mit dem Master aus seiner `config/wrapper.json`. Der Standard `127.0.0.1:1234` passt, wenn beide auf derselben Maschine laufen. Auf einer anderen Maschine trägst du bei `address` die IP des Masters ein.

## 4. Wrapper beim Master registrieren

Führe den ausgegebenen Befehl in der Konsole des **Masters** aus:

```text
wrapper add 127.0.0.1 6f1c...-...-...
```

Die Adresse ist die IP des Wrappers, **wie der Master und die Proxys sie sehen**: `127.0.0.1` auf derselben Maschine, sonst die LAN- oder öffentliche IP des Wrappers. Der Master antwortet mit `Wrapper Wrapper-1 added`, und der Wrapper verbindet sich innerhalb weniger Sekunden.

Für zusätzlichen Schutz bei der ersten Verbindung trägst du den Fingerprint des Masters bei `masterFingerprint` in der `config/wrapper.json` des Wrappers ein. Bleibt das Feld leer, vertraut der Wrapper dem ersten Master, den er erreicht, und merkt sich dessen Fingerprint, so wie SSH.

## 5. Prüfen

Der Master meldet `Wrapper-1 connected` und `Templates of Wrapper-1 synced`. Die Cloud ist jetzt bereit für die ersten Gruppen.

Weiter geht es mit [Proxy und Lobby anlegen](/docs/first-network), damit Spieler joinen können.

## Updates

Der Launcher prüft bei jedem Start auf neue Versionen (`auto_update=true` in `launcher.cnf`) und aktualisiert Master, Wrapper und sich selbst. Zum Aktualisieren startest du sie neu. Ein Neustart des Masters stoppt das Netzwerk nicht: Die Wrapper lassen ihre Server laufen und verbinden sich neu.
