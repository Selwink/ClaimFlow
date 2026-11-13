# Curve Lab Emulator

Windows-app die je fysieke controller uitleest, een eigen response curve en deadzone toepast en het resultaat
doorgeeft aan een virtuele Xbox 360-controller. De game speelt met de virtuele controller.

```
fysieke controller ──XInput──▶ curve + deadzone ──ViGEmBus──▶ virtuele Xbox 360-controller ──▶ game
```

## Installeren

1. Installeer [Python 3.10+](https://www.python.org/downloads/windows/) (vink "Add to PATH" en "tcl/tk" aan).
2. Open een terminal in deze map en voer uit: `pip install -r requirements.txt`.
   Dit installeert `vgamepad` en start de installer van de ViGEmBus-driver.
3. Start de app: `python app.py`.

## Gebruik

1. Sluit je controller aan vóór je op **Start emulator** drukt.
2. Kies een profiel of stel de curve per stick af. Wijzigingen werken direct, ook tijdens het spelen.
3. Verberg de fysieke controller voor games met [HidHide](https://github.com/nefarius/HidHide) en zet
   `python.exe` op de lijst met toegestane apps. Zonder HidHide ziet de game twee controllers en krijg je dubbele invoer.
4. **Opslaan** bewaart het huidige profiel in `profiles.json` onder de naam in het profielveld.

## Instellingen

| Instelling | Wat het doet |
|---|---|
| Curve | Lineair, Classic, Exponentieel, Dynamic, S-curve, Dual zone of een eigen exponent |
| Deadzone (binnen) | Uitslag waaronder de stick niets doorgeeft; zet hem net boven je drift |
| Outer threshold | Uitslag vanaf waar de stick 100% geeft |
| Anti-deadzone | Slaat de vaste deadzone van een game over; alleen gebruiken als de game er zelf een heeft |
| Trigger-deadzone / hair triggers | Dode slag van de triggers; hair triggers geven direct volle uitslag |

Gebruik één curve-laag: kies je hier Dynamic, zet de game dan op Linear. Laat je de game op Dynamic staan,
gebruik dan het profiel met alleen een deadzone.

## Beperkingen

- Alleen Windows, en alleen controllers die als XInput-apparaat werken (Xbox-layout, GameSir Tarantula 8K, de meeste pc-controllers).
  Een DualSense heeft eerst DS4Windows of Steam Input nodig.
- De lus draait op 1000 Hz. Een polling rate van 8000 Hz wordt dus niet doorgegeven; reken op tot 1 ms extra vertraging.
- De Guide-knop, gyro en trillen worden niet doorgegeven.
- De app is op Linux getest op de curve-wiskunde (`python -m pytest tests`). Het venster, het uitlezen via XInput
  en de virtuele controller zijn nog niet op een Windows-pc gedraaid.

## Anti-cheat

De app verandert alleen de stickrespons van een echte controller. Hij zet geen muis of toetsenbord om naar
controller-invoer en doet niets met aim assist. Toch kan een game met anti-cheat (zoals Ricochet in Call of Duty)
virtuele controllers en de ViGEmBus-driver opmerken. Gebruik in online games is op eigen risico; controleer de regels van de game.
