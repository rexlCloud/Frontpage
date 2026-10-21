---
title: Fragen in der Konsole
description: "Aus deinem Modul Schritt für Schritt Fragen in der Konsole des Masters stellen, wie group create: geprüfte Antworten, Tab-Vervollständigung, Folgefragen."
group: develop
order: 2
---

Manche Befehle brauchen mehr als ein Argument, und manche Argumente hängen von früheren Antworten ab. Statt einer langen Befehlszeile kann ein Modul seine Fragen nacheinander in der Konsole des Masters stellen, genau wie `group create`:

```text
Name of the arena? desert
Mode? (Tab: solo, duo, squad) duo
Players per team? 2
Start servers right away? true
How many servers? 3
```

Während der Fragen zeigt die Konsole nur die aktuelle Frage und hält Log-Zeilen bis zum Schluss zurück. <kbd>Tab</kbd> bietet die möglichen Antworten an, eine Antwort, die die Frage nicht akzeptiert, stellt sie erneut, und <kbd>Strg</kbd>+<kbd>C</kbd> bricht ab.

Referenz (auf Englisch): die Pakete `de.rexlcloud.core.console.animation` in der [Javadoc der Module-API](/api/module-api/). Diese Seite baut auf [Ein Modul schreiben](/docs/modules) auf.

## Fragen stellen

Eine `ConsoleAnimation` enthält die Fragen. Jede Frage hat einen **Schlüssel**, mit dem du später ihre Antwort liest. Gestartet wird sie aus einem Befehl:

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
                // Ein Wort, das noch nicht vergeben ist
                .addQuestion(new StringAnimationQuestionBlacklistNoBlanks("name", "Name of the arena?",
                        null, arenas.names()))
                // Nur diese Antworten; Tab bietet sie an
                .addQuestion(new StringAnimationQuestionWhitelist("mode", "Mode?", "solo", "duo", "squad"))
                // Eine Zahl in einem Bereich, mit Vorschlägen und Beschreibungen für Tab
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
            Integer servers = done.getDirectInt("servers");   // null, wenn nicht gefragt
            // Die Callbacks laufen im Konsolen-Thread: die Arbeit woanders erledigen
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
            // Ein Wort, das noch nicht vergeben ist
            .addQuestion(StringAnimationQuestionBlacklistNoBlanks("name", "Name of the arena?",
                null, arenas.names()))
            // Nur diese Antworten; Tab bietet sie an
            .addQuestion(StringAnimationQuestionWhitelist("mode", "Mode?", "solo", "duo", "squad"))
            // Eine Zahl in einem Bereich, mit Vorschlägen und Beschreibungen für Tab
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
            val servers: Int? = done.getDirectInt("servers")   // null, wenn nicht gefragt
            // Die Callbacks laufen im Konsolen-Thread: die Arbeit woanders erledigen
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

`ArenaStore` steht für die eigenen Daten deines Moduls. Registriert wird die Klasse wie andere Befehle auch: `getCommandManager().registerCommands(this, new ArenaCommands(...))`.

## Folgefragen

Eine Frage kann abhängig von ihrer Antwort weitere Fragen hinzufügen. Nimm dafür `onFinishFirst`, damit sie hinzukommen, bevor die Animation prüft, ob sie fertig ist. So hinzugefügte Fragen kommen nach allen anderen:

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

## Fragetypen

Alle in `de.rexlcloud.core.console.animation.questions`:

| Frage | Akzeptiert | Lesen mit |
| --- | --- | --- |
| `StringAnimationQuestion` | beliebigen Text | `getDirectString` |
| `StringAnimationQuestionWhitelist` | eine der angegebenen Antworten (per Tab angeboten) | `getDirectString` |
| `StringAnimationQuestionBlacklist` | beliebigen Text außer den angegebenen | `getDirectString` |
| `StringAnimationQuestionBlacklistNoBlanks` | ein Wort außer den angegebenen, z. B. einen neuen Namen | `getDirectString` |
| `IntegerAnimationQuestion` | eine ganze Zahl, optional begrenzt mit `setMinValue`/`setMaxValue` | `getDirectInt` |
| `LongAnimationQuestion` | eine ganze Zahl über den `int`-Bereich hinaus | `getDirectLong` |
| `DoubleAnimationQuestion`, `FloatAnimationQuestion` | eine Dezimalzahl | `getDirect` |
| `BooleanAnimationQuestion` | `true` oder `false` | `getDirectBoolean` |
| `ServerTypeAnimationQuestion` | `SERVER` oder `PROXY` | `getDirectServerType` |

`get(key)` liefert die Antwort als `Optional`, `getDirect(key)` als beliebigen Typ; beide sind leer bzw. `null` für Fragen, die nicht gestellt wurden. Jede Frage nimmt `AnimationCompletion`s für <kbd>Tab</kbd>, jeweils mit optionaler Beschreibung.

## Ein eigener Fragetyp

Erweitere `AnimationQuestion` mit dem Typ der Antwort: `canBeAnswered` entscheidet, ob eine Eingabe gültig ist (sonst wird die Frage erneut gestellt), `parseAnswer` macht daraus die Antwort.

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

Die Antwort liest du mit `animation.<UUID>getDirect("player")` (Kotlin: `animation.getDirect<UUID>("player")`).

## Gut zu wissen

- Es läuft immer nur eine Animation. Läuft schon eine (z. B. hat jemand `group create` eingegeben), wartet deine, bis sie fertig ist.
- Die Antworten sind beim Tippen sichtbar und bleiben auf dem Bildschirm, also frag so keine Passwörter ab.
- `onFinish` und `onCancel` laufen im Konsolen-Thread, und die Konsole liest keine Eingaben, bis sie zurückkehren. Starte für alles, was dauert, einen Thread, etwa für Downloads oder Datenbankarbeit.
- Die Fragen gibt es nur in der Konsole des Masters, sie sind also für Module. Plugins auf Servern und Proxys nutzen die Befehle ihrer Plattform.
