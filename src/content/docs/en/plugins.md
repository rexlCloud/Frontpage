---
title: Plugins for servers and proxies
description: "Use the cloud from Paper, Spigot, Velocity and BungeeCord plugins: players, servers, states and message channels."
group: develop
order: 2
---

Every server and proxy started by the cloud gets the cloud plugin automatically: the **Bridge** on Paper and Spigot, the **proxy plugin** on Velocity and BungeeCord. Your own plugins use the cloud through it with `RexlCloudApi`, which is the same on every platform.

Reference: [Bridge API](/api/bukkit-api/), [Proxy API](/api/proxy-api/), and the shared classes in the [Module API](/api/module-api/) (`RexlCloudApi`, `Player`, `Server`, `MessageChannel`).

## Dependencies

```groovy
repositories {
    maven { url = 'https://repo.rexlcloud.de/snapshots' }
}

dependencies {
    // Paper/Spigot
    compileOnly 'de.rexlcloud:bukkit-api:{version}'
    // or Velocity/BungeeCord
    compileOnly 'de.rexlcloud:proxy-api:{version}'
}
```

Always `compileOnly` (Maven: `provided`): the cloud plugin is already on the server. The Bridge runs on Java 21 and newer and only uses Bukkit API that exists since 1.8.8.

Declare the dependency so the cloud plugin is loaded first:

| Platform | How |
| --- | --- |
| Paper/Spigot | `depend: [rexlCloudBridge]` in `plugin.yml` |
| Velocity | `dependencies = @Dependency(id = "rexlcloud_proxy")` in `@Plugin` |
| BungeeCord | `depends: [rexlCloudProxy]` in `bungee.yml` |

## The API

```java
RexlCloudApi cloud = RexlCloudApi.getInstance();
```

The cloud plugin connects to its wrapper in the background right after the server starts; until then `getInstance()` returns `null`. Use the API in events, commands and scheduled tasks, or check for `null` in `onEnable`. It keeps a cache of all servers, wrappers and players that the cloud updates in real time:

```java
// The name of this server, e.g. "Lobby-1"
String me = cloud.getServerName();

// Read the cache directly
for (Server server : cloud.getCachedServers()) {
    getLogger().info(server.getName() + " " + server.getState());
}

// Or ask the master; every call returns a CompletableFuture
cloud.getPlayer("Notch").thenAccept(player -> player.connect("BedWars-1"));

cloud.getServerGroup("BedWars")
        .thenCompose(group -> cloud.startServer(group, 2))
        .thenAccept(servers -> getLogger().info("Started " + servers.length + " servers"));
```

Futures complete exceptionally with `NoConnectionException` while the plugin is not connected and with `TimeOutException` after ten seconds without an answer.

> Futures complete on the network thread. On Paper and Spigot, switch back to the main thread before you touch the world: `Bukkit.getScheduler().runTask(plugin, () -> ...)`.

## Players

```java
cloud.getPlayer(uuid).thenAccept(player -> {
    player.sendMessage(CloudText.parse("<green>Your round starts now"));  // MiniMessage
    player.connect("BedWars-2");                          // move to another server
    player.connectToFallbackServer();                      // back to a lobby
    player.kick("<red>Maintenance");                       // MiniMessage or & codes
});
```

Players also carry data that is stored in the cloud's database and is the same on every server:

```java
player.setData("coins", 250);
int coins = player.<Integer>getData("coins").orElse(0);
```

## Server states

A minigame tells the others what it is doing; lobbies can show it on signs or in a menu:

```java
cloud.getServer(cloud.getServerName()).thenAccept(server -> server.setState("INGAME"));
```

Only a server can change its own state.

## Message channels

Send your own objects between servers and proxies. Both sides register the channel with the same name and type:

```java
public record PartyInvite(UUID from, UUID to) implements Serializable {}

MessageChannel<PartyInvite> invites = RexlCloudApi.getMessageChannelManager()
        .registerMessageChannel("party-invite", PartyInvite.class);

invites.addListener((server, invite) ->
        getLogger().info("Invite from " + server.getName()));

// Send it to one or more servers
cloud.getServer("Proxy-1").thenAccept(proxy -> invites.sendMessage(new PartyInvite(a, b), proxy));
```

Only JDK value types (strings, numbers, collections, time types) and your own classes can be sent. Other classes are refused, because deserializing arbitrary classes from the network can run code.

## Locations

The Bridge converts between Bukkit locations and the cloud's `ServerLocation`, for example to send a player to a position on another server:

```java
ServerLocation target = RexlCloudHelper.locationToServerLocation(location);
player.connectAndTeleport("Build-1", target);
```
