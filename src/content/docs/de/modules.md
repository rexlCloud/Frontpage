---
title: Ein Modul schreiben
description: "Den Master mit einem eigenen Modul erweitern: Events, Konsolenbefehle und die ModuleApi."
group: develop
order: 1
---

Ein **Modul** läuft im Master. Es sieht das ganze Netzwerk und kann es verändern: Server starten und stoppen, Gruppen bearbeiten, Spielern schreiben, auf Events reagieren und Konsolenbefehle hinzufügen. Das RestModule hinter dem Webpanel ist selbst ein Modul.

Die vollständige Referenz ist die [Javadoc der Module-API](/api/module-api/) (auf Englisch). Ein komplettes Modul zum Loslegen: [Example-cloud-module](https://github.com/rexlCloud/Example-cloud-module) (Events, Konsolenbefehle, Fragen in der Konsole, Konfiguration). Jedes Beispiel auf dieser Seite gibt es in Java und Kotlin, jede Build-Datei für Gradle und Maven; die Tabs merken sich deine Wahl.

## Projekt einrichten

Füge das rexlCloud-Repository und `module-api` als `compileOnly`-Abhängigkeit hinzu (Maven: `provided`), denn der Master enthält sie bereits:

```kotlin tab="Gradle (Kotlin)"
plugins {
    java
}

repositories {
    mavenCentral()
    maven("https://repo.rexlcloud.de/snapshots")
}

dependencies {
    compileOnly("de.rexlcloud:module-api:{version}")
}

java {
    toolchain.languageVersion = JavaLanguageVersion.of(25)
}
```

```groovy tab="Gradle (Groovy)"
plugins {
    id 'java'
}

repositories {
    mavenCentral()
    maven { url = 'https://repo.rexlcloud.de/snapshots' }
}

dependencies {
    compileOnly 'de.rexlcloud:module-api:{version}'
}

java {
    toolchain.languageVersion = JavaLanguageVersion.of(25)
}
```

```xml tab="Maven"
<properties>
    <maven.compiler.release>25</maven.compiler.release>
</properties>

<repositories>
    <repository>
        <id>rexlcloud</id>
        <url>https://repo.rexlcloud.de/snapshots</url>
    </repository>
</repositories>

<dependencies>
    <dependency>
        <groupId>de.rexlcloud</groupId>
        <artifactId>module-api</artifactId>
        <version>{version}</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

> **In Kotlin?** Der Master bringt die Kotlin-Standardbibliothek nicht mit, also gehört sie in deine Jar: `kotlin("jvm") version "2.4.21"` und das Shadow-Plugin (`id("com.gradleup.shadow") version "9.6.1"`) anwenden und die Jar aus `shadowJar` installieren. Mit Maven nimmst du das `kotlin-maven-plugin` und das `maven-shade-plugin`.

## module.json

Jede Modul-Jar enthält eine `module.json` im Hauptverzeichnis (`src/main/resources/module.json`):

```json
{
  "name": "WelcomeModule",
  "main": "com.example.welcome.WelcomeModule",
  "author": "du",
  "version": "1.0"
}
```

## Die Hauptklasse

Die Hauptklasse erweitert `CloudModule`:

```java tab="Java"
package com.example.welcome;

import de.rexlcloud.core.api.module.CloudModule;

public class WelcomeModule extends CloudModule {

    @Override
    public void onEnable() {
        getEventManager().registerEvent(new PlayerListener(getModuleApi()));
        getCommandManager().registerCommands(this, new WelcomeCommands(getModuleApi()));
    }

    @Override
    public void onDisable() {
        getCommandManager().unregisterAllCommands(this);
    }

    @Override
    public void onReload() {
    }
}
```

```kotlin tab="Kotlin"
package com.example.welcome

import de.rexlcloud.core.api.module.CloudModule

class WelcomeModule : CloudModule() {

    override fun onEnable() {
        eventManager.registerEvent(PlayerListener(moduleApi))
        commandManager.registerCommands(this, WelcomeCommands(moduleApi))
    }

    override fun onDisable() {
        commandManager.unregisterAllCommands(this)
    }

    override fun onReload() {
    }
}
```

`getDataFolder()` (Kotlin: `dataFolder`) ist der eigene Ordner des Moduls, `modules/<name>/`, für seine Konfiguration.

## Events

Listener-Methoden tragen `@EventHandler` und nehmen genau ein Event:

```java tab="Java"
import de.rexlcloud.core.api.events.EventHandler;
import de.rexlcloud.core.api.events.events.player.PlayerCloudJoinEvent;
import de.rexlcloud.core.api.module.ModuleApi;

public class PlayerListener {

    private final ModuleApi api;

    public PlayerListener(ModuleApi api) {
        this.api = api;
    }

    @EventHandler
    public void onJoin(PlayerCloudJoinEvent event) {
        api.messagePlayer(event.getPlayer().getUuid(), "<aqua>Willkommen im Netzwerk!");
    }
}
```

```kotlin tab="Kotlin"
import de.rexlcloud.core.api.events.EventHandler
import de.rexlcloud.core.api.events.events.player.PlayerCloudJoinEvent
import de.rexlcloud.core.api.module.ModuleApi

class PlayerListener(private val api: ModuleApi) {

    @EventHandler
    fun onJoin(event: PlayerCloudJoinEvent) {
        api.messagePlayer(event.player.uuid, "<aqua>Willkommen im Netzwerk!")
    }
}
```

Es gibt Events für Spieler (Join, Quit, Serverwechsel), Server (Start, Stop) und Wrapper (verbunden, getrennt); siehe das Paket `de.rexlcloud.core.api.events.events`.

## Konsolenbefehle

```java tab="Java"
import de.rexlcloud.core.command.Argument;
import de.rexlcloud.core.command.CommandDescription;
import de.rexlcloud.core.command.CommandMethod;
import de.rexlcloud.core.api.module.ModuleApi;
import de.rexlcloud.core.console.Console;

public class WelcomeCommands {

    private final ModuleApi api;

    public WelcomeCommands(ModuleApi api) {
        this.api = api;
    }

    @CommandMethod("welcome start <group> <amount>")
    @CommandDescription("Starts servers of a group")
    public void start(@Argument("group") String group, @Argument("amount") int amount) {
        if (!api.start(group, amount)) {
            Console.error("The group %s does not exist", group);
        }
    }
}
```

```kotlin tab="Kotlin"
import de.rexlcloud.core.api.module.ModuleApi
import de.rexlcloud.core.command.Argument
import de.rexlcloud.core.command.CommandDescription
import de.rexlcloud.core.command.CommandMethod
import de.rexlcloud.core.console.Console

class WelcomeCommands(private val api: ModuleApi) {

    @CommandMethod("welcome start <group> <amount>")
    @CommandDescription("Starts servers of a group")
    fun start(@Argument("group") group: String, @Argument("amount") amount: Int) {
        if (!api.start(group, amount)) {
            Console.error("The group %s does not exist", group)
        }
    }
}
```

Befehle, die mehrere Antworten brauchen, können sie nacheinander abfragen, wie `group create`: siehe [Fragen in der Konsole](/docs/console-questions).

## Die ModuleApi

`getModuleApi()` (Kotlin: `moduleApi`) kann alles, was Konsole und Webpanel können. Ein paar Beispiele:

```java tab="Java"
var api = getModuleApi();

api.getServerInfos(null);                 // alle Server als JSON
api.start("BedWars", 2);                  // zwei Server starten
api.execute("Lobby-1", "say Hallo");      // einen Konsolenbefehl ausführen
api.setMaintenance(true);                 // Wartungsmodus für das ganze Netzwerk
api.kickPlayer(uuid, "<red>Tschüss");     // MiniMessage
api.subscribeConsole("Lobby-1", line -> Console.info(line));
```

```kotlin tab="Kotlin"
val api = moduleApi

api.getServerInfos(null)                  // alle Server als JSON
api.start("BedWars", 2)                   // zwei Server starten
api.execute("Lobby-1", "say Hallo")       // einen Konsolenbefehl ausführen
api.isMaintenance = true                  // Wartungsmodus für das ganze Netzwerk
api.kickPlayer(uuid, "<red>Tschüss")      // MiniMessage
api.subscribeConsole("Lobby-1") { line -> Console.info(line) }
```

Methoden, die etwas ändern, geben ein `ModuleApiResult` mit Status und Nachricht zurück; Abfragen liefern JSON mit denselben Schlüsseln wie die REST-API.

## Installieren

Baue die Jar und kopiere sie in den Ordner `modules/` des Masters. Lade sie mit `modules load <datei>` oder starte den Master neu; `modules reload <name>` ruft `onReload()` auf.
