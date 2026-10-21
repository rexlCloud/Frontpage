---
title: Minestom and custom jars
description: "Run your own server.jar in a group and connect a Minestom server to the cloud with the MinestomBridge."
group: develop
order: 3
---

A group does not have to run Paper or Spigot. With a **custom jar** it starts any `server.jar` you give it, for example a [Minestom](https://minestom.net) server. The **MinestomBridge** connects such a server to the cloud, so it appears like any other server and can use the full API.

Reference: [Minestom API Javadoc](/api/minestom-api/).

## A custom jar group

Choose **Custom jar** when you create the group in the web panel, `CUSTOM` in `group create`, or `"server_jar": "CUSTOM"` in the API. Nothing is downloaded. Then put your jar into the template:

```text
templates/<group>/default/server.jar
```

You can upload it on the **Templates** page of the web panel. The group's servers wait until the jar is there. For static groups it goes into `servers/templates/<group>/default/` on their wrapper.

The wrapper starts it with `java -jar server.jar` and the group's memory and Java arguments. It adds no cloud plugin, no Paper/Spigot configuration and no start arguments. Everything the server needs is in the `cloud.json` in its folder: name, port, forwarding mode and secret, and the token for the wrapper.

## The MinestomBridge

Add it to your Minestom server, in the same version as the cloud:

```groovy
repositories {
    mavenCentral()
    maven { url = 'https://repo.rexlcloud.de/snapshots' }
}

dependencies {
    implementation 'net.minestom:minestom:2026.10.07-26.2'
    implementation 'de.rexlcloud:minestom-api:{version}'
}
```

Build a fat jar (e.g. with the Shadow plugin), because the wrapper starts it with `java -jar`.

```java
import de.rexlcloud.bridge.RexlCloudBridge;
import net.minestom.server.MinecraftServer;

public final class Main {

    public static void main(String[] args) {
        var cloud = RexlCloudBridge.getInstance();
        // Velocity/BungeeCord forwarding like the proxies use
        var server = MinecraftServer.init(cloud.getAuth());

        // ... create instances, register events ...

        // Connects to the wrapper; the cloud API is usable from now on
        cloud.initialize();
        server.start("0.0.0.0", cloud.getPort());
    }
}
```

After `initialize()` the server has the same `RexlCloudApi` as Paper plugins; see [Plugins for servers and proxies](/docs/plugins).

## Good to know

- Started by hand without a `cloud.json`, the server runs offline on port 25565 and does not connect to a cloud. Handy for testing.
- When the cloud stops the server or its wrapper goes away for good, the server stops. Change that with `setShutdownHook`.
- The bridge must match the cloud's version. Rebuild your server when you update the cloud.
