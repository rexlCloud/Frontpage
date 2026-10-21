---
title: Writing a module
description: "Extend the master with your own module: events, console commands and the ModuleApi."
group: develop
order: 1
---

A **module** runs inside the master. It sees the whole network and can change it: start and stop servers, edit groups, message players, react to events and add console commands. The RestModule behind the web panel is a module itself.

The full reference is the [Module API Javadoc](/api/module-api/).

## Project setup

Add the rexlCloud repository and `module-api` as a `compileOnly` dependency, because the master already contains it:

```groovy
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

```java
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

`getDataFolder()` is the module's own folder, `modules/<name>/`, for its configuration.

## Events

Listener methods are annotated with `@EventHandler` and take one event:

```java
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

There are events for players (join, quit, server change), servers (start, stop) and wrappers (connected, disconnected); see the `de.rexlcloud.core.api.events.events` package.

## Console commands

```java
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

## The ModuleApi

`getModuleApi()` can do everything the console and the web panel can. A few examples:

```java
var api = getModuleApi();

api.getServerInfos(null);                 // all servers as JSON
api.start("BedWars", 2);                  // start two servers
api.execute("Lobby-1", "say Hello");      // run a console command
api.setMaintenance(true);                 // maintenance mode for the whole network
api.kickPlayer(uuid, "<red>Bye");         // MiniMessage
api.subscribeConsole("Lobby-1", line -> Console.info(line));
```

Methods that change something return a `ModuleApiResult` with a status and a message; queries return JSON with the same keys as the REST API.

## Install it

Build the jar and copy it into the master's `modules/` folder. Load it with `modules load <file>` or restart the master; `modules reload <name>` calls `onReload()`.
