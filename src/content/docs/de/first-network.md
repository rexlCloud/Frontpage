---
title: Dein erstes Netzwerk
description: "Proxy und Lobby anlegen, Plugins über Templates installieren und dem Netzwerk beitreten."
group: start
order: 2
---

Ein Netzwerk besteht aus **Gruppen**. Jeder Server gehört zu einer Gruppe, und die Gruppe bestimmt Typ, Speicher, Server-Software und wie viele Server online bleiben. Diese Seite legt die zwei Gruppen an, die jedes Netzwerk braucht: einen Proxy und eine Lobby.

## Proxy-Gruppe anlegen

Gib `group create` in der Konsole des Masters ein. Es folgen ein paar Fragen; mit <kbd>Tab</kbd> siehst du die möglichen Antworten.

```text
> group create
Name of the new group? Proxy
Type of the new group? PROXY
How much memory should each server have? 512
Should this group be static? false
How many servers should be online? 1
Should servers from this group be fallbacks? false
What server version should get installed? VELOCITY_3_5_0
```

Die Cloud lädt Velocity herunter und startet `Proxy-1` auf einem Wrapper. Proxys bekommen Ports ab **25565**, der erste Proxy ist also unter `deine-ip:25565` erreichbar.

Statt Velocity kannst du BungeeCord wählen (`BUNGEECORD_...`). Dann stellst du vorher `forwardingMode` in `config/master.json` auf `LEGACY`; siehe [Forwarding](#spieler-forwarding) weiter unten.

## Lobby-Gruppe anlegen

```text
> group create
Name of the new group? Lobby
Type of the new group? SERVER
How much memory should each server have? 1024
Should this group be static? false
How many servers should be online? 1
Should servers from this group be fallbacks? true
What server version should get installed? PAPER_26_3
```

**Fallback**-Gruppen sind die Server, auf denen Spieler beim Joinen und nach einem Kick von einem anderen Server landen. Jedes Netzwerk braucht mindestens eine.

Server bekommen Ports ab **25700**. Sie müssen nur für die Proxys erreichbar sein, nicht für Spieler.

Verbinde dich jetzt mit Minecraft zu `deine-ip:25565`. Du landest auf `Lobby-1`.

## Statisch oder nicht?

- **Nicht-statische Gruppen** (Standard) starten jeden Server frisch aus dem Template. Welten und Änderungen verschwinden, wenn der Server stoppt. Genau richtig für Lobbys und Minispiele.
- **Statische Gruppen** haben genau einen Server, der seine Dateien auf einem festen Wrapper behält, z. B. eine Survival-Welt oder ein Bauserver. Die Cloud fragt, auf welchem Wrapper er liegen soll.

## Templates

Der Ordner `templates/` des Masters ist die Quelle aller Server-Dateien:

| Ordner | Wird kopiert auf |
| --- | --- |
| `templates/global/server/` | jeden Server |
| `templates/global/proxy/` | jeden Proxy |
| `templates/<gruppe>/default/` | jeden Server der Gruppe |
| `templates/<gruppe>/<variante>/` | eine zufällige Variante pro Server (z. B. `map-desert`, `map-forest`) |

Spätere Ebenen ersetzen Dateien der früheren. Um ein Plugin auf allen Lobbys zu installieren, legst du es nach `templates/Lobby/default/plugins/`. Etwa zwei Sekunden später hat es jeder Wrapper, und neue Server starten damit.

Eine Map auf einem laufenden Server gebaut? Speichere sie ins Template:

```text
server save Lobby-1 default
```

Das Webpanel kann all das ebenfalls; siehe die [Anleitung zum Webpanel](/docs/web-panel).

## Nützliche Befehle

| Befehl | Wirkung |
| --- | --- |
| `server start <gruppe> <anzahl>` | Startet weitere Server einer Gruppe |
| `server stop <server>` | Stoppt einen Server; die Gruppe startet einen neuen, falls sie ihn braucht |
| `server execute <server> <befehl>` | Führt einen Befehl in der Konsole eines Servers aus |
| `group edit <gruppe> memory <MB>` | Ändert den Speicher einer Gruppe (auch `minServers`, `maxPlayers`, `isFallback`, `java`) |
| `group sync template <gruppe>` | Lässt alle Wrapper das Template der Gruppe neu prüfen |
| `maintenance true` | Nur Spieler mit `rexlcloud.maintenance.join` können joinen |

## Spieler-Forwarding

Der Proxy gibt die echte UUID und IP jedes Spielers an die Server weiter. Den Modus wählst du in `config/master.json`:

| `forwardingMode` | Für |
| --- | --- |
| `MODERN` (Standard) | Velocity mit Paper 1.13 oder neuer. Server sind ohne den Proxy nicht erreichbar. |
| `LEGACY` | BungeeCord, Spigot oder Server älter als 1.13. Sperre die Server-Ports (ab 25700) in der Firewall, denn wer sie direkt erreicht, könnte als beliebiger Spieler joinen. |

Danach die Server neu starten.

## Ältere Minecraft-Versionen

Jede Gruppe wählt ihre eigene Java-Version: `group edit <gruppe> java <pfad>` oder die Gruppenseite im Webpanel. Die Wrapper melden jedes Java, das sie finden. Server älter als 1.20.5 brauchen für das Cloud-Plugin Java 21; Paper 1.8.8 läuft damit problemlos.
