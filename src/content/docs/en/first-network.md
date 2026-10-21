---
title: Your first network
description: "Create a proxy and a lobby, add plugins through templates and join the network."
group: start
order: 2
---

A network consists of **groups**. Every server belongs to a group, and the group decides its type, memory, server software and how many servers stay online. This page creates the two groups every network needs: a proxy and a lobby.

## Create the proxy group

Type `group create` in the master console. It asks a few questions; press <kbd>Tab</kbd> to see the possible answers.

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

The cloud downloads Velocity and starts `Proxy-1` on a wrapper. Proxies get ports from **25565** upwards, so the first proxy is reachable at `your-ip:25565`.

You can choose BungeeCord instead of Velocity (`BUNGEECORD_...`). In that case set `forwardingMode` to `LEGACY` in `config/master.json` first; see [forwarding](#player-forwarding) below.

## Create the lobby group

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

**Fallback** groups are where players land when they join and when they are kicked from another server. Every network needs at least one.

Servers get ports from **25700** upwards. They only have to be reachable by the proxies, not by players.

Now connect to `your-ip:25565` with Minecraft. You land on `Lobby-1`.

## Static or not?

- **Non-static groups** (the default) start every server fresh from the template. Worlds and changes are thrown away when the server stops. This is what lobbies and minigames want.
- **Static groups** have exactly one server that keeps its files on a fixed wrapper, e.g. a survival world or a build server. The cloud asks which wrapper it should live on.

## Templates

The master's `templates/` folder is the source of every server's files:

| Folder | Gets copied to |
| --- | --- |
| `templates/global/server/` | every server |
| `templates/global/proxy/` | every proxy |
| `templates/<group>/default/` | every server of the group |
| `templates/<group>/<variant>/` | one variant per server, chosen at random (e.g. `map-desert`, `map-forest`) |

Later layers replace files of earlier ones. To install a plugin on all lobbies, put it into `templates/Lobby/default/plugins/`. About two seconds later every wrapper has it, and new servers start with it.

Built a map on a running server? Save it into the template:

```text
server save Lobby-1 default
```

The web panel can do all of this as well; see the [web panel guide](/docs/web-panel).

## Useful commands

| Command | What it does |
| --- | --- |
| `server start <group> <amount>` | Starts more servers of a group |
| `server stop <server>` | Stops a server; its group starts a new one if it needs it |
| `server execute <server> <command>` | Runs a command in a server's console |
| `group edit <group> memory <MB>` | Changes a group's memory (also `minServers`, `maxPlayers`, `isFallback`, `java`) |
| `group sync template <group>` | Makes all wrappers check the group's template again |
| `maintenance true` | Only players with `rexlcloud.maintenance.join` can join |

## Player forwarding

The proxy passes each player's real UUID and IP to the servers. Choose the mode in `config/master.json`:

| `forwardingMode` | Use it for |
| --- | --- |
| `MODERN` (default) | Velocity with Paper 1.13 or newer. Servers cannot be joined without the proxy. |
| `LEGACY` | BungeeCord, Spigot, or servers older than 1.13. Block the server ports (25700 and up) in your firewall, because anyone who reaches them directly could join as any player. |

Restart the servers after changing it.

## Older Minecraft versions

Each group picks its own Java runtime: `group edit <group> java <path>` or the group page in the web panel. The wrappers report every Java they find. Servers older than 1.20.5 need Java 21 for the cloud plugin; Paper 1.8.8 runs fine on it.
