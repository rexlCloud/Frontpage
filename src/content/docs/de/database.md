---
title: Datenbank (H2 oder MySQL)
description: "Die eingebaute H2-Datenbank, Backups, der Wechsel zu MySQL oder MariaDB und das Umziehen der Daten."
group: operate
order: 3
---

Der Master speichert Spieler, ihre Daten und die Statistiken des Netzwerks in einer Datenbank. Sie wird in `config/database.json` eingestellt.

## Eingebaute H2-Datenbank (Standard)

Neue Installationen nutzen eine eingebaute H2-Datenbank im Ordner `database/` des Masters:

```json
{
  "type": "h2"
}
```

Es gibt nichts einzurichten, und sie ist schnell genug für Netzwerke auf einer oder wenigen Maschinen.

### Backups

In der Konsole des Masters:

```text
database backup
```

Das schreibt ein Backup nach `database/backups/`, während die Cloud weiterläuft. Zum Wiederherstellen stoppst du den Master und entpackst das Backup nach `database/`.

## MySQL oder MariaDB

Für größere Netzwerke, oder wenn du schon einen Datenbankserver betreibst, nimm MySQL oder MariaDB. Lege eine Datenbank und einen Benutzer an:

```sql
CREATE DATABASE rexlcloud CHARACTER SET utf8mb4;
CREATE USER 'rexlcloud'@'localhost' IDENTIFIED BY 'ein-langes-zufaelliges-passwort';
GRANT ALL PRIVILEGES ON rexlcloud.* TO 'rexlcloud'@'localhost';
```

Dann `config/database.json`:

```json
{
  "type": "mysql",
  "host": "127.0.0.1",
  "port": 3306,
  "user": "rexlcloud",
  "password": "ein-langes-zufaelliges-passwort",
  "database": "rexlcloud"
}
```

Der Master legt seine Tabellen beim nächsten Start an. MySQL sicherst du mit `mysqldump` oder den Backups deines Hosters; `database backup` funktioniert nur für H2.

## In eine andere Datenbank umziehen

Ob von H2 zu MySQL oder zurück, die Cloud kopiert die Daten für dich:

1. Trage die Einstellungen der neuen Datenbank in `config/database-target.json` ein, im selben Format wie `database.json`. Das Ziel muss leer sein.
2. Führe `database copy` in der Konsole des Masters aus. Es kopiert Spieler, ihre Daten und die Statistiken.
3. Stoppe den Master, benenne `database-target.json` in `database.json` um und starte ihn wieder.

> `database.json`-Dateien von vor 2.0.16 haben kein `type` und nutzen weiter MySQL.
