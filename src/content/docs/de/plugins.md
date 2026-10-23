---
title: Plugins für Server und Proxys
description: "Die Cloud aus Plugins für Paper, Spigot, Velocity und BungeeCord nutzen: Spieler, Server, Status und Message-Channels."
group: develop
order: 3
---

Jeder Server und Proxy, den die Cloud startet, bekommt das Cloud-Plugin automatisch: die **Bridge** auf Paper und Spigot, das **Proxy-Plugin** auf Velocity und BungeeCord. Deine eigenen Plugins nutzen die Cloud darüber mit `RexlCloudApi`, das auf jeder Plattform gleich ist.

Referenz (auf Englisch): [Bridge-API](/api/bukkit-api/), [Proxy-API](/api/proxy-api/) und die gemeinsamen Klassen in der [Module-API](/api/module-api/) (`RexlCloudApi`, `Player`, `Server`, `MessageChannel`).

Komplette Plugins zum Loslegen: [Example-paper-plugin](https://github.com/rexlCloud/Example-paper-plugin) und [Example-proxy-plugin](https://github.com/rexlCloud/Example-proxy-plugin) (eine Jar für Velocity und BungeeCord). Sie sprechen über einen Message-Channel miteinander.

## Abhängigkeiten

```kotlin tab="Gradle (Kotlin)"
repositories {
    maven("https://repo.rexlcloud.de/releases")
}

dependencies {
    // Paper/Spigot
    compileOnly("de.rexlcloud:bukkit-api:{version}")
    // oder Velocity/BungeeCord
    compileOnly("de.rexlcloud:proxy-api:{version}")
}
```

```groovy tab="Gradle (Groovy)"
repositories {
    maven { url = 'https://repo.rexlcloud.de/releases' }
}

dependencies {
    // Paper/Spigot
    compileOnly 'de.rexlcloud:bukkit-api:{version}'
    // oder Velocity/BungeeCord
    compileOnly 'de.rexlcloud:proxy-api:{version}'
}
```

```xml tab="Maven"
<repositories>
    <repository>
        <id>rexlcloud</id>
        <url>https://repo.rexlcloud.de/releases</url>
    </repository>
</repositories>

<dependencies>
    <!-- Paper/Spigot; oder proxy-api für Velocity/BungeeCord -->
    <dependency>
        <groupId>de.rexlcloud</groupId>
        <artifactId>bukkit-api</artifactId>
        <version>{version}</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

Immer `compileOnly` (Maven: `provided`): Das Cloud-Plugin ist schon auf dem Server. Die Bridge läuft ab Java 21 und nutzt nur Bukkit-API, die es seit 1.8.8 gibt. Plugins in Kotlin müssen die Kotlin-Standardbibliothek selbst mitbringen, z. B. mit dem Shadow-Plugin in die Jar gepackt oder über `libraries:` in der `plugin.yml` von Paper.

Gib die Abhängigkeit an, damit das Cloud-Plugin zuerst geladen wird:

| Plattform | Wie |
| --- | --- |
| Paper/Spigot | `depend: [rexlCloudBridge]` in der `plugin.yml` |
| Velocity | `dependencies = @Dependency(id = "rexlcloud_proxy")` in `@Plugin` |
| BungeeCord | `depends: [rexlCloudProxy]` in der `bungee.yml` |

## Die API

```java tab="Java"
RexlCloudApi cloud = RexlCloudApi.getInstance();
```

```kotlin tab="Kotlin"
val cloud = RexlCloudApi.getInstance()
```

Das Cloud-Plugin verbindet sich direkt nach dem Serverstart im Hintergrund mit seinem Wrapper; bis dahin gibt `getInstance()` `null` zurück. Nutze die API in Events, Befehlen und geplanten Tasks oder prüfe in `onEnable` auf `null`. Sie hält einen Cache aller Server, Wrapper und Spieler, den die Cloud in Echtzeit aktualisiert:

```java tab="Java"
// Der Name dieses Servers, z. B. "Lobby-1"
String me = cloud.getServerName();

// Direkt aus dem Cache lesen
for (Server server : cloud.getCachedServers()) {
    getLogger().info(server.getName() + " " + server.getState());
}

// Oder den Master fragen; jeder Aufruf gibt eine CompletableFuture zurück
cloud.getPlayer("Notch").thenAccept(player -> player.connect("BedWars-1"));

cloud.getServerGroup("BedWars")
        .thenCompose(group -> cloud.startServer(group, 2))
        .thenAccept(servers -> getLogger().info("Started " + servers.length + " servers"));
```

```kotlin tab="Kotlin"
// Der Name dieses Servers, z. B. "Lobby-1"
val me = cloud.serverName

// Direkt aus dem Cache lesen
for (server in cloud.cachedServers) {
    logger.info("${server.name} ${server.state}")
}

// Oder den Master fragen; jeder Aufruf gibt eine CompletableFuture zurück
cloud.getPlayer("Notch").thenAccept { player -> player.connect("BedWars-1") }

cloud.getServerGroup("BedWars")
    .thenCompose { group -> cloud.startServer(group, 2) }
    .thenAccept { servers -> logger.info("Started ${servers.size} servers") }
```

Futures schlagen mit `NoConnectionException` fehl, solange das Plugin nicht verbunden ist, und mit `TimeOutException` nach zehn Sekunden ohne Antwort.

> Futures werden im Netzwerk-Thread abgeschlossen. Auf Paper und Spigot wechselst du zurück in den Haupt-Thread, bevor du die Welt anfasst: `Bukkit.getScheduler().runTask(plugin, () -> ...)` (Kotlin: `runTask(plugin) { ... }`).

## Spieler

```java tab="Java"
cloud.getPlayer(uuid).thenAccept(player -> {
    player.sendMessage(CloudText.parse("<green>Deine Runde startet jetzt"));  // MiniMessage
    player.connect("BedWars-2");                          // auf einen anderen Server schicken
    player.connectToFallbackServer();                      // zurück in eine Lobby
    player.kick("<red>Wartungsarbeiten");                  // MiniMessage oder &-Codes
});
```

```kotlin tab="Kotlin"
cloud.getPlayer(uuid).thenAccept { player ->
    player.sendMessage(CloudText.parse("<green>Deine Runde startet jetzt"))  // MiniMessage
    player.connect("BedWars-2")                           // auf einen anderen Server schicken
    player.connectToFallbackServer()                      // zurück in eine Lobby
    player.kick("<red>Wartungsarbeiten")                  // MiniMessage oder &-Codes
}
```

Spieler tragen außerdem Daten, die in der Datenbank der Cloud gespeichert und auf jedem Server gleich sind:

```java tab="Java"
player.setData("coins", 250);
int coins = player.<Integer>getData("coins").orElse(0);
```

```kotlin tab="Kotlin"
player.setData("coins", 250)
val coins = player.getData<Int>("coins").orElse(0)
```

Die Daten bleiben erhalten, wenn der Spieler geht. `getOfflinePlayer` liest und ändert sie, egal ob der Spieler online ist oder nicht, per UUID oder mit dem Namen, mit dem er zuletzt beigetreten ist; ist er online, kommt die Änderung bei seinem `Player` auf jedem Server an:

```java tab="Java"
// z. B. eine Belohnung für einen Spieler, der offline ist
cloud.getOfflinePlayer("Notch").thenAccept(offline -> {
    int coins = offline.<Integer>getData("coins").orElse(0);
    offline.setData("coins", coins + 100);
}).exceptionally(error -> null);  // PlayerNotFoundException: der Spieler war noch nie im Netzwerk
```

```kotlin tab="Kotlin"
// z. B. eine Belohnung für einen Spieler, der offline ist
cloud.getOfflinePlayer("Notch").thenAccept { offline ->
    val coins = offline.getData<Int>("coins").orElse(0)
    offline.setData("coins", coins + 100)
}.exceptionally { null }  // PlayerNotFoundException: der Spieler war noch nie im Netzwerk
```

`offline.getLastLogin()`, `getFirstLogin()`, `isOnline()` und `getDataKeys()` verraten mehr über den Spieler.

## Server-Status

Ein Minispiel teilt den anderen mit, was es gerade tut; Lobbys können das auf Schildern oder in einem Menü zeigen:

```java tab="Java"
cloud.getServer(cloud.getServerName()).thenAccept(server -> server.setState("INGAME"));
```

```kotlin tab="Kotlin"
cloud.getServer(cloud.serverName).thenAccept { server -> server.setState("INGAME") }
```

Nur ein Server selbst kann seinen Status ändern.

## Message-Channels

Schicke eigene Objekte zwischen Servern und Proxys. Beide Seiten registrieren den Channel mit gleichem Namen und Typ:

```java tab="Java"
public record PartyInvite(UUID from, UUID to) implements Serializable {}

MessageChannel<PartyInvite> invites = RexlCloudApi.getMessageChannelManager()
        .registerMessageChannel("party-invite", PartyInvite.class);

invites.addListener((server, invite) ->
        getLogger().info("Invite from " + server.getName()));

// An einen oder mehrere Server schicken
cloud.getServer("Proxy-1").thenAccept(proxy -> invites.sendMessage(new PartyInvite(a, b), proxy));
```

```kotlin tab="Kotlin"
data class PartyInvite(val from: UUID, val to: UUID) : Serializable

val invites = RexlCloudApi.getMessageChannelManager()
    .registerMessageChannel("party-invite", PartyInvite::class.java)

invites.addListener { server, invite ->
    logger.info("Invite from ${server.name}")
}

// An einen oder mehrere Server schicken
cloud.getServer("Proxy-1").thenAccept { proxy -> invites.sendMessage(PartyInvite(a, b), proxy) }
```

Verschickt werden können nur JDK-Werttypen (Strings, Zahlen, Collections, Zeittypen) und deine eigenen Klassen. Andere Klassen werden abgelehnt, weil das Deserialisieren beliebiger Klassen aus dem Netzwerk Code ausführen kann.

## Positionen

Die Bridge wandelt zwischen Bukkit-Locations und der `ServerLocation` der Cloud um, zum Beispiel um einen Spieler an eine Position auf einem anderen Server zu schicken:

```java tab="Java"
ServerLocation target = RexlCloudHelper.locationToServerLocation(location);
player.connectAndTeleport("Build-1", target);
```

```kotlin tab="Kotlin"
val target = RexlCloudHelper.locationToServerLocation(location)
player.connectAndTeleport("Build-1", target)
```
