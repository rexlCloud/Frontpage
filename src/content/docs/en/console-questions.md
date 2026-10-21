---
title: Questions in the console
description: "Ask step-by-step questions in the master console from your module, like group create does: answers checked, Tab completion, follow-up questions."
group: develop
order: 2
---

Some commands need more than one argument, and some arguments depend on earlier answers. Instead of a long command line, a module can ask its questions one after another in the master console, the same way `group create` does:

```text
Name of the arena? desert
Mode? (Tab: solo, duo, squad) duo
Players per team? 2
Start servers right away? true
How many servers? 3
```

While the questions run, the console shows only the current question and keeps log lines back until the end. <kbd>Tab</kbd> offers the possible answers, an answer the question does not accept asks it again, and <kbd>Ctrl</kbd>+<kbd>C</kbd> cancels.

Reference: the `de.rexlcloud.core.console.animation` packages in the [Module API Javadoc](/api/module-api/). This page builds on [Writing a module](/docs/modules). The [Example-cloud-module](https://github.com/rexlCloud/Example-cloud-module) has a complete question flow (`GroupWizard`).

## Asking questions

A `ConsoleAnimation` holds the questions. Every question has a **key** to read its answer with later. Start the animation from a command:

```java tab="Java"
import de.rexlcloud.core.api.module.ModuleApi;
import de.rexlcloud.core.command.CommandDescription;
import de.rexlcloud.core.command.CommandMethod;
import de.rexlcloud.core.console.Console;
import de.rexlcloud.core.console.animation.AnimationCompletion;
import de.rexlcloud.core.console.animation.ConsoleAnimation;
import de.rexlcloud.core.console.animation.questions.BooleanAnimationQuestion;
import de.rexlcloud.core.console.animation.questions.IntegerAnimationQuestion;
import de.rexlcloud.core.console.animation.questions.StringAnimationQuestionBlacklistNoBlanks;
import de.rexlcloud.core.console.animation.questions.StringAnimationQuestionWhitelist;

public class ArenaCommands {

    private final ModuleApi api;
    private final ArenaStore arenas;

    public ArenaCommands(ModuleApi api, ArenaStore arenas) {
        this.api = api;
        this.arenas = arenas;
    }

    @CommandMethod("arena create")
    @CommandDescription("Creates an arena step by step")
    public void create() {
        var animation = new ConsoleAnimation()
                // One word that is not taken yet
                .addQuestion(new StringAnimationQuestionBlacklistNoBlanks("name", "Name of the arena?",
                        null, arenas.names()))
                // Only these answers; Tab offers them
                .addQuestion(new StringAnimationQuestionWhitelist("mode", "Mode?", "solo", "duo", "squad"))
                // A number in a range, with suggestions and descriptions for Tab
                .addQuestion(new IntegerAnimationQuestion("teamSize", "Players per team?",
                        new AnimationCompletion("1", "solo"),
                        new AnimationCompletion("2", "duo"),
                        new AnimationCompletion("4", "squad"))
                        .setMinValue(1).setMaxValue(16));

        animation.addQuestion(startQuestion(animation));

        animation.onFinish(done -> {
            var name = done.getDirectString("name");
            var mode = done.getDirectString("mode");
            int teamSize = done.getDirectInt("teamSize");
            Integer servers = done.getDirectInt("servers");   // null if not asked
            // The callbacks run on the console thread: do the work elsewhere
            Thread.ofVirtual().start(() -> {
                arenas.create(name, mode, teamSize);
                if (servers != null) {
                    api.start("Arena-" + name, servers);
                }
                Console.info("Created the arena %s", name);
            });
        });
        animation.onCancel(cancelled -> Console.info("No arena was created"));

        Console.addConsoleAnimation(animation);
    }
}
```

```kotlin tab="Kotlin"
import de.rexlcloud.core.api.module.ModuleApi
import de.rexlcloud.core.command.CommandDescription
import de.rexlcloud.core.command.CommandMethod
import de.rexlcloud.core.console.Console
import de.rexlcloud.core.console.animation.AnimationCompletion
import de.rexlcloud.core.console.animation.ConsoleAnimation
import de.rexlcloud.core.console.animation.questions.BooleanAnimationQuestion
import de.rexlcloud.core.console.animation.questions.IntegerAnimationQuestion
import de.rexlcloud.core.console.animation.questions.StringAnimationQuestionBlacklistNoBlanks
import de.rexlcloud.core.console.animation.questions.StringAnimationQuestionWhitelist

class ArenaCommands(private val api: ModuleApi, private val arenas: ArenaStore) {

    @CommandMethod("arena create")
    @CommandDescription("Creates an arena step by step")
    fun create() {
        val animation = ConsoleAnimation()
            // One word that is not taken yet
            .addQuestion(StringAnimationQuestionBlacklistNoBlanks("name", "Name of the arena?",
                null, arenas.names()))
            // Only these answers; Tab offers them
            .addQuestion(StringAnimationQuestionWhitelist("mode", "Mode?", "solo", "duo", "squad"))
            // A number in a range, with suggestions and descriptions for Tab
            .addQuestion(IntegerAnimationQuestion("teamSize", "Players per team?",
                AnimationCompletion("1", "solo"),
                AnimationCompletion("2", "duo"),
                AnimationCompletion("4", "squad"))
                .setMinValue(1).setMaxValue(16))

        animation.addQuestion(startQuestion(animation))

        animation.onFinish { done ->
            val name = done.getDirectString("name")!!
            val mode = done.getDirectString("mode")!!
            val teamSize = done.getDirectInt("teamSize")!!
            val servers: Int? = done.getDirectInt("servers")   // null if not asked
            // The callbacks run on the console thread: do the work elsewhere
            Thread.ofVirtual().start {
                arenas.create(name, mode, teamSize)
                if (servers != null) {
                    api.start("Arena-$name", servers)
                }
                Console.info("Created the arena %s", name)
            }
        }
        animation.onCancel { Console.info("No arena was created") }

        Console.addConsoleAnimation(animation)
    }
}
```

`ArenaStore` stands for your module's own data. Register the class like any other commands: `getCommandManager().registerCommands(this, new ArenaCommands(...))`.

## Follow-up questions

A question can add more questions depending on its answer. Use `onFinishFirst`, so they are added before the animation checks whether it is done. Questions added this way are asked after all others:

```java tab="Java"
private static BooleanAnimationQuestion startQuestion(ConsoleAnimation animation) {
    var start = new BooleanAnimationQuestion("start", "Start servers right away?");
    start.onFinishFirst(answer -> {
        if (answer.get()) {
            animation.addQuestion(new IntegerAnimationQuestion("servers", "How many servers?")
                    .setMinValue(1).setMaxValue(20));
        }
    });
    return start;
}
```

```kotlin tab="Kotlin"
private fun startQuestion(animation: ConsoleAnimation): BooleanAnimationQuestion {
    val start = BooleanAnimationQuestion("start", "Start servers right away?")
    start.onFinishFirst { answer ->
        if (answer.get()) {
            animation.addQuestion(IntegerAnimationQuestion("servers", "How many servers?")
                .setMinValue(1).setMaxValue(20))
        }
    }
    return start
}
```

## Question types

All in `de.rexlcloud.core.console.animation.questions`:

| Question | Accepts | Read with |
| --- | --- | --- |
| `StringAnimationQuestion` | any text | `getDirectString` |
| `StringAnimationQuestionWhitelist` | one of the given answers (offered with Tab) | `getDirectString` |
| `StringAnimationQuestionBlacklist` | any text except the given ones | `getDirectString` |
| `StringAnimationQuestionBlacklistNoBlanks` | one word except the given ones, e.g. a new name | `getDirectString` |
| `IntegerAnimationQuestion` | a whole number, optionally limited with `setMinValue`/`setMaxValue` | `getDirectInt` |
| `LongAnimationQuestion` | a whole number beyond the `int` range | `getDirectLong` |
| `DoubleAnimationQuestion`, `FloatAnimationQuestion` | a decimal number | `getDirect` |
| `BooleanAnimationQuestion` | `true` or `false` | `getDirectBoolean` |
| `ServerTypeAnimationQuestion` | `SERVER` or `PROXY` | `getDirectServerType` |

`get(key)` returns the answer as an `Optional`, `getDirect(key)` as any type; both are empty or `null` for questions that were not asked. Every question takes `AnimationCompletion`s for <kbd>Tab</kbd>, each with an optional description.

## Your own question type

Extend `AnimationQuestion` with the type of the answer: `canBeAnswered` decides whether an input is valid (otherwise the question is asked again), `parseAnswer` turns it into the answer.

```java tab="Java"
import de.rexlcloud.core.console.animation.AnimationQuestion;

import java.util.UUID;

public class UuidAnimationQuestion extends AnimationQuestion<UUID> {

    public UuidAnimationQuestion(String key, String question) {
        super(key, question);
    }

    @Override
    public boolean canBeAnswered(String input) {
        try {
            UUID.fromString(input);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    public UUID parseAnswer(String input) {
        return UUID.fromString(input);
    }
}
```

```kotlin tab="Kotlin"
import de.rexlcloud.core.console.animation.AnimationQuestion
import java.util.UUID

class UuidAnimationQuestion(key: String, question: String) : AnimationQuestion<UUID>(key, question) {

    override fun canBeAnswered(input: String): Boolean =
        runCatching { UUID.fromString(input) }.isSuccess

    override fun parseAnswer(input: String): UUID = UUID.fromString(input)
}
```

Read the answer with `animation.<UUID>getDirect("player")` (Kotlin: `animation.getDirect<UUID>("player")`).

## Good to know

- Questions are asked one animation at a time. If another one is running (e.g. someone typed `group create`), yours waits until it is done.
- The answers are typed visibly and stay on screen, so don't ask for passwords this way.
- `onFinish` and `onCancel` run on the console thread, and the console reads no input until they return. Start a thread for anything that takes time, like downloads or database work.
- Questions only exist in the master console, so they are for modules. Plugins on servers and proxies use their platform's own commands.
