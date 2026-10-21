---
title: Minestom und eigene Jars
description: "Eine eigene server.jar in einer Gruppe starten und einen Minestom-Server mit der MinestomBridge an die Cloud anbinden."
group: develop
order: 3
---

Eine Gruppe muss nicht Paper oder Spigot starten. Mit einer **eigenen Jar** (Custom Jar) startet sie jede `server.jar`, die du ihr gibst, zum Beispiel einen [Minestom](https://minestom.net)-Server. Die **MinestomBridge** verbindet so einen Server mit der Cloud: Er erscheint wie jeder andere Server und kann die ganze API nutzen.

Referenz (auf Englisch): [Javadoc der Minestom-API](/api/minestom-api/).

## Eine Custom-Jar-Gruppe

Wähle beim Anlegen der Gruppe im Webpanel **Custom jar**, in `group create` `CUSTOM` oder in der API `"server_jar": "CUSTOM"`. Es wird nichts heruntergeladen. Lege dann deine Jar ins Template:

```text
templates/<gruppe>/default/server.jar
```

Hochladen kannst du sie auf der Seite **Templates** im Webpanel. Die Server der Gruppe warten, bis die Jar da ist. Bei statischen Gruppen gehört sie nach `servers/templates/<gruppe>/default/` auf ihrem Wrapper.

Der Wrapper startet sie mit `java -jar server.jar` und dem Speicher und den Java-Argumenten der Gruppe. Er fügt kein Cloud-Plugin, keine Paper-/Spigot-Konfiguration und keine Startargumente hinzu. Alles, was der Server braucht, steht in der `cloud.json` in seinem Ordner: Name, Port, Forwarding-Modus und -Secret sowie das Token für den Wrapper.

## Die MinestomBridge

Füge sie deinem Minestom-Server hinzu, in derselben Version wie die Cloud:

```kotlin tab="Gradle (Kotlin)"
repositories {
    mavenCentral()
    maven("https://repo.rexlcloud.de/snapshots")
}

dependencies {
    implementation("net.minestom:minestom:2026.10.07-26.2")
    implementation("de.rexlcloud:minestom-api:{version}")
}
```

```groovy tab="Gradle (Groovy)"
repositories {
    mavenCentral()
    maven { url = 'https://repo.rexlcloud.de/snapshots' }
}

dependencies {
    implementation 'net.minestom:minestom:2026.10.07-26.2'
    implementation 'de.rexlcloud:minestom-api:{version}'
}
```

```xml tab="Maven"
<repositories>
    <repository>
        <id>rexlcloud</id>
        <url>https://repo.rexlcloud.de/snapshots</url>
    </repository>
</repositories>

<dependencies>
    <dependency>
        <groupId>net.minestom</groupId>
        <artifactId>minestom</artifactId>
        <version>2026.10.07-26.2</version>
    </dependency>
    <dependency>
        <groupId>de.rexlcloud</groupId>
        <artifactId>minestom-api</artifactId>
        <version>{version}</version>
    </dependency>
</dependencies>
```

Baue eine Fat-Jar (z. B. mit dem Shadow-Plugin), denn der Wrapper startet sie mit `java -jar`. In Kotlin heißt die Hauptklasse einer `fun main` in `Main.kt` `MainKt`.

```java tab="Java"
import de.rexlcloud.bridge.RexlCloudBridge;
import net.minestom.server.MinecraftServer;

public final class Main {

    public static void main(String[] args) {
        var cloud = RexlCloudBridge.getInstance();
        // Velocity-/BungeeCord-Forwarding wie bei den Proxys
        var server = MinecraftServer.init(cloud.getAuth());

        // ... Instanzen anlegen, Events registrieren ...

        // Verbindet sich mit dem Wrapper; ab jetzt ist die Cloud-API nutzbar
        cloud.initialize();
        server.start("0.0.0.0", cloud.getPort());
    }
}
```

```kotlin tab="Kotlin"
import de.rexlcloud.bridge.RexlCloudBridge
import net.minestom.server.MinecraftServer

fun main() {
    val cloud = RexlCloudBridge.getInstance()
    // Velocity-/BungeeCord-Forwarding wie bei den Proxys
    val server = MinecraftServer.init(cloud.auth)

    // ... Instanzen anlegen, Events registrieren ...

    // Verbindet sich mit dem Wrapper; ab jetzt ist die Cloud-API nutzbar
    cloud.initialize()
    server.start("0.0.0.0", cloud.port)
}
```

Nach `initialize()` hat der Server dieselbe `RexlCloudApi` wie Paper-Plugins; siehe [Plugins für Server und Proxys](/docs/plugins).

## Gut zu wissen

- Von Hand ohne `cloud.json` gestartet, läuft der Server offline auf Port 25565 und verbindet sich mit keiner Cloud. Praktisch zum Testen.
- Stoppt die Cloud den Server oder bleibt sein Wrapper dauerhaft weg, stoppt der Server. Ändern kannst du das mit `setShutdownHook`.
- Die Bridge muss zur Version der Cloud passen. Baue deinen Server nach einem Cloud-Update neu.
