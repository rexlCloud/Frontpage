---
title: Installation
description: "From an empty machine to a running master and wrapper in about five minutes."
group: start
order: 1
---

rexlCloud consists of two programs that the **launcher** starts and keeps up to date:

- the **master** holds the configuration, the templates and the database and decides where servers run. You need exactly one.
- a **wrapper** runs on every machine that should host servers. It starts them, syncs the templates and reports memory and CPU to the master.

Master and wrapper can share one machine. That is the easiest way to begin, and this guide does exactly that.

## Requirements

- **Java 25** for the master and the wrapper. Check with `java -version`.
- **Java 21 or newer** for the Minecraft servers (the same Java 25 works for current versions).
- Linux is recommended. Windows works too, which is handy for testing.
- At least 2 GB of free memory, plus the memory of the servers you want to run.
- Optional: `git` if you want Spigot (it is built with BuildTools on first use), `tmux` for [detached servers](/docs/linux-service).

> On Debian or Ubuntu without Java 25, download a JDK from [adoptium.net](https://adoptium.net) and unpack it, e.g. into `/opt/jdk-25`. The [Linux service guide](/docs/linux-service) shows the full setup with its own user.

## 1. Download the launcher

Create a folder for the master and one for the wrapper, and put the launcher into both:

```bash
mkdir -p ~/rexlcloud/master ~/rexlcloud/wrapper
cd ~/rexlcloud
curl -L -o master/launcher.jar https://repo.rexlcloud.de/downloads/de/rexlcloud/launcher/{version}/launcher-{version}.jar
cp master/launcher.jar wrapper/launcher.jar
```

You can also get it from the [download page](/download).

## 2. Start the master

```bash
cd ~/rexlcloud/master
java -Xms256M -Xmx1G -jar launcher.jar --master
```

Without `--master` the launcher asks whether to start the master or a wrapper. On the first start it downloads the master and creates:

| Folder | Content |
| --- | --- |
| `config/` | `master.json` (port, maintenance, forwarding), `database.json`, `messages.json`, `groups.json`, `wrappers.json`, `tls/` |
| `templates/` | The templates of your groups and the global templates |
| `database/` | The embedded H2 database |
| `modules/` | Modules such as the RestModule for the web panel |

The console shows the **TLS fingerprint** of the master (`TLS fingerprint of the master: ...`). Keep it at hand for step 4.

The master listens for wrappers on port **1234** (`port` in `config/master.json`). Only your wrappers need to reach it; block it for everyone else.

## 3. Start a wrapper

Open a second terminal (or use `tmux`/`screen`):

```bash
cd ~/rexlcloud/wrapper
java -Xms256M -Xmx1G -jar launcher.jar --wrapper
```

On its first start the wrapper creates a key and prints the command that registers it:

```text
No auth key found, creating a new one!
Register the wrapper on the master with this command: "wrapper add 127.0.0.1 6f1c...-...-..."
```

The wrapper connects to the master set in its `config/wrapper.json`. The default `127.0.0.1:1234` is right when both run on the same machine. On another machine, set `address` to the master's IP.

## 4. Register the wrapper on the master

Run the printed command in the **master** console:

```text
wrapper add 127.0.0.1 6f1c...-...-...
```

The address is the wrapper's IP **as the master and the proxies see it**: `127.0.0.1` on the same machine, otherwise the wrapper's LAN or public IP. The master answers with `Wrapper Wrapper-1 added` and the wrapper connects within a few seconds.

For extra protection on the first connection, copy the fingerprint the master shows into `masterFingerprint` in the wrapper's `config/wrapper.json`. If you leave it empty, the wrapper trusts the first master it reaches and remembers its fingerprint, like SSH does.

## 5. Check it

The master logs `Wrapper-1 connected` and `Templates of Wrapper-1 synced`. The cloud is now ready for its first groups.

Next: [create a proxy and a lobby](/docs/first-network) so players can join.

## Updates

The launcher checks for new versions on every start (`auto_update=true` in `launcher.cnf`) and updates the master, the wrapper and itself. To update, restart them. Restarting the master does not stop the network: the wrappers keep their servers running and reconnect.
