---
title: Writing a module
description: "Extend the master with your own module: events, console commands and the ModuleApi."
group: develop
order: 1
---

A **module** runs inside the master. It sees the whole network and can change it: start and stop servers, edit groups, message players, react to events and add console commands. The RestModule behind the web panel is a module itself.

The full reference is the [Module API Javadoc](/api/module-api/). A complete module to start from: [Example-cloud-module](https://github.com/rexlCloud/Example-cloud-module) (events, console commands, console questions, configuration). Every example on this page is in Java and Kotlin, and every build file for Gradle and Maven; the tabs remember your choice.

## Project setup

Add the rexlCloud repository and `module-api` as a `compileOnly` dependency (Maven: `provided`), because the master already contains it:

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

> **Writing it in Kotlin?** The master does not ship the Kotlin standard library, so put it into your jar: apply `kotlin("jvm") version "2.4.21"` and the Shadow plugin (`id("com.gradleup.shadow") version "9.6.1"`) and install the jar from `shadowJar`. With Maven, use the `kotlin-maven-plugin` and the `maven-shade-plugin`.

## module.json

Every module jar contains a `module.json` in its root (`src/main/resources/module.json`):

```json
{
  "name": "WelcomeModule",
  "main": "com.example.welcome.WelcomeModule",
  "author": "you",
  "version": "1.0"
}
```

## The main class

The main class extends `CloudModule`:

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

`getDataFolder()` (Kotlin: `dataFolder`) is the module's own folder, `modules/<name>/`, for its configuration.

## Events

Listener methods are annotated with `@EventHandler` and take one event:

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
        api.messagePlayer(event.getPlayer().getUuid(), "<aqua>Welcome to the network!");
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
        api.messagePlayer(event.player.uuid, "<aqua>Welcome to the network!")
    }
}
```

There are events for players (join, quit, server change), servers (start, stop) and wrappers (connected, disconnected); see the `de.rexlcloud.core.api.events.events` package.

## Console commands

```java tab="Java"
import de.rexlcloud.core.api.module.ModuleApi;
import de.rexlcloud.core.command.Argument;
import de.rexlcloud.core.command.CommandDescription;
import de.rexlcloud.core.command.CommandMethod;
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

Commands that need several answers can ask them one after another, like `group create`: see [Questions in the console](/docs/console-questions).

## The ModuleApi

`getModuleApi()` (Kotlin: `moduleApi`) can do everything the console and the web panel can. A few examples:

```java tab="Java"
var api = getModuleApi();

api.getServerInfos(null);                 // all servers as JSON
api.start("BedWars", 2);                  // start two servers
api.execute("Lobby-1", "say Hello");      // run a console command
api.setMaintenance(true);                 // maintenance mode for the whole network
api.kickPlayer(uuid, "<red>Bye");         // MiniMessage
api.subscribeConsole("Lobby-1", line -> Console.info(line));
```

```kotlin tab="Kotlin"
val api = moduleApi

api.getServerInfos(null)                  // all servers as JSON
api.start("BedWars", 2)                   // start two servers
api.execute("Lobby-1", "say Hello")       // run a console command
api.isMaintenance = true                  // maintenance mode for the whole network
api.kickPlayer(uuid, "<red>Bye")          // MiniMessage
api.subscribeConsole("Lobby-1") { line -> Console.info(line) }
```

Methods that change something return a `ModuleApiResult` with a status and a message; queries return JSON with the same keys as the REST API.

## Install it

Build the jar and copy it into the master's `modules/` folder. Load it with `modules load <file>` or restart the master; `modules reload <name>` calls `onReload()`.
