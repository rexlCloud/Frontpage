---
title: Database (H2 or MySQL)
description: "The embedded H2 database, backups, switching to MySQL or MariaDB and moving data between them."
group: operate
order: 3
---

The master keeps players, their data and the network statistics in a database. It is configured in `config/database.json`.

## Embedded H2 (default)

New installations use an embedded H2 database in the master's `database/` folder:

```json
{
  "type": "h2"
}
```

There is nothing to set up, and it is fast enough for networks on one or a few machines.

### Backups

Type this in the master console:

```text
database backup
```

It writes a backup into `database/backups/` while the cloud keeps running. To restore one, stop the master and unpack the backup into `database/`.

## MySQL or MariaDB

For larger networks, or if you already run a database server, use MySQL or MariaDB. Create a database and a user:

```sql
CREATE DATABASE rexlcloud CHARACTER SET utf8mb4;
CREATE USER 'rexlcloud'@'localhost' IDENTIFIED BY 'a-long-random-password';
GRANT ALL PRIVILEGES ON rexlcloud.* TO 'rexlcloud'@'localhost';
```

Then `config/database.json`:

```json
{
  "type": "mysql",
  "host": "127.0.0.1",
  "port": 3306,
  "user": "rexlcloud",
  "password": "a-long-random-password",
  "database": "rexlcloud"
}
```

The master creates its tables on the next start. Back up MySQL with `mysqldump` or your host's backups; `database backup` only works for H2.

## Moving to another database

Whether you go from H2 to MySQL or back, the cloud copies the data for you:

1. Put the settings of the new database into `config/database-target.json`, in the same format as `database.json`. The target has to be empty.
2. Run `database copy` in the master console. It copies players, their data and the statistics.
3. Stop the master, rename `database-target.json` to `database.json` and start it again.

> `database.json` files from before 2.0.16 have no `type` and keep using MySQL.
