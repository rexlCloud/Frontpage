---
title: Running as a Linux service
description: "Master and wrappers as systemd services with tmux consoles, detached servers and a firewall."
group: operate
order: 1
---

For a production network the master and the wrappers should start with the machine, restart on updates and keep their console reachable. This guide sets them up as **systemd** services that run inside **tmux**, so you can attach to the console at any time. It is the exact setup of our own test network.

## 1. A user for the cloud

Never run game servers as root:

```bash
sudo apt install tmux git curl
sudo useradd --create-home --shell /bin/bash cloud
sudo -iu cloud
```

## 2. Java 25

Download a JDK 25 for Linux x64 from [adoptium.net](https://adoptium.net) and unpack it into the home folder:

```bash
mkdir -p ~/jdk-25
curl -L https://api.adoptium.net/v3/binary/latest/25/ga/linux/x64/jdk/hotspot/normal/eclipse | tar -xz --strip-components=1 -C ~/jdk-25
~/jdk-25/bin/java -version
```

The wrappers find runtimes in the home folder automatically, so groups can choose between this Java and any other one you install (e.g. Java 21 for old Minecraft versions).

## 3. Folders and start scripts

```bash
mkdir -p ~/master ~/wrapper
curl -L -o ~/master/launcher.jar https://repo.rexlcloud.de/downloads/de/rexlcloud/launcher/{version}/launcher-{version}.jar
cp ~/master/launcher.jar ~/wrapper/launcher.jar
```

`~/master/start.sh`:

```bash
#!/bin/sh
export PATH=/home/cloud/jdk-25/bin:$PATH
cd /home/cloud/master
exec java -Xms256M -Xmx1G -jar launcher.jar --master
```

`~/wrapper/start.sh` is the same with `wrapper` instead of `master`. Make both executable with `chmod +x ~/master/start.sh ~/wrapper/start.sh`.

Start each once by hand to set them up as described in the [installation guide](/docs/installation): register the wrapper with `wrapper add`, then stop both again (`stop`).

## 4. Detached servers

By default the servers are child processes of the wrapper and stop when it stops. With **detached servers** every server runs in its own tmux session and keeps running through wrapper restarts and updates. The wrapper attaches to them again when it comes back.

In `~/wrapper/config/wrapper.json`:

```json
"detachedServers": true
```

In this mode `detach` (and `systemctl stop`) leaves the servers running; only `stop` stops them. A server whose wrapper stays away for two minutes shuts itself down.

To look at a server's console directly: `tmux -L rexlcloud-2243 ls` (the socket is named after the wrapper's `serverPort`).

## 5. systemd units

Back as root, create `/etc/systemd/system/rexlcloud-master.service`:

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

And `/etc/systemd/system/rexlcloud-wrapper.service`:

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
# The servers run in their own tmux sessions (detachedServers) and must outlive the wrapper
KillMode=process

[Install]
WantedBy=multi-user.target
```

> **KillMode=process is important** for detached servers. Without it systemd stops every process the service ever started when the wrapper stops, including the servers' tmux sessions. Without detached servers, use `stop` instead of `detach` in `ExecStop`.

Enable and start both:

```bash
systemctl daemon-reload
systemctl enable --now rexlcloud-master rexlcloud-wrapper
```

Open a console with `su - cloud -c "tmux -L master attach"` and leave it again with <kbd>Ctrl</kbd>+<kbd>B</kbd>, <kbd>D</kbd>.

## 6. Updates

`systemctl restart rexlcloud-master` updates the master; the network keeps running, and the wrappers reconnect within seconds. `systemctl restart rexlcloud-wrapper` updates a wrapper; with detached servers its servers stay online.

## 7. Firewall

| Port | Who needs it |
| --- | --- |
| 25565 and up | Players (proxies) |
| 1234 | Wrappers on other machines (master) |
| 4343 | The web panel, if you use the [RestModule](/docs/web-panel) |
| 25700 and up | Only the proxies; block it for everyone else |

With servers and proxies on the same machine, block the server ports from outside like this (also with `ip6tables`):

```bash
iptables -I INPUT -p tcp --dport 25700:25999 ! -i lo -j DROP
```

With wrappers on several machines, allow the proxy machines' IPs instead of dropping everything.
