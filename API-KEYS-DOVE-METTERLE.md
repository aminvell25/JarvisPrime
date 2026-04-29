# API Keys J.A.R.V.I.S. Prime - Dove Trovarle e Dove Metterle

Questo progetto usa 2 chiavi:

- `ANTHROPIC_API_KEY` per Claude, usato dal backend in `backend/core/config.py`
- `DEEPGRAM_API_KEY` per speech-to-text e fallback text-to-speech, usato dal backend in `backend/core/config.py`

Non scrivere mai le key dentro file `.py`, `.md`, log, screenshot o chat. Le key vanno messe come variabili d'ambiente.

---

## 1. Dove Trovare La Anthropic API Key

Link:

- Console Anthropic: https://console.anthropic.com/
- Documentazione Anthropic API: https://docs.anthropic.com/en/api/getting-started

Passaggi:

1. Apri https://console.anthropic.com/
2. Accedi o crea un account.
3. Vai nelle impostazioni dell'account / API keys.
4. Crea una nuova API key.
5. Copiala subito: di solito viene mostrata solo una volta.

La key di Anthropic di solito inizia con:

```text
sk-ant-...
```

Questa key va messa in:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-la-tua-key"
```

---

## 2. Dove Trovare La Deepgram API Key

Link:

- Console Deepgram: https://console.deepgram.com/
- Guida ufficiale Deepgram API keys: https://developers.deepgram.com/docs/create-additional-api-keys
- Autenticazione Deepgram: https://developers.deepgram.com/docs/authenticating

Passaggi:

1. Apri https://console.deepgram.com/
2. Accedi o crea un account.
3. Entra nel tuo progetto Deepgram.
4. Vai nella sezione API Keys.
5. Crea o copia una API key.
6. Salvala subito in un posto sicuro: Deepgram avvisa che per sicurezza non potra mostrarti di nuovo la key completa.

Questa key va messa in:

```powershell
$env:DEEPGRAM_API_KEY = "la-tua-key-deepgram"
```

---

## 3. Dove Metterle Per Avviare JARVIS

Apri PowerShell e lancia:

```powershell
cd "C:\Applicazioni GAME\jarvis-prime"

$env:ANTHROPIC_API_KEY = "sk-ant-la-tua-key"
$env:DEEPGRAM_API_KEY = "la-tua-key-deepgram"

py -m backend.main
```

Poi in un altro PowerShell:

```powershell
cd "C:\Applicazioni GAME\jarvis-prime\frontend"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm start
```

---

## 4. Renderle Permanenti Su Windows

Se non vuoi riscriverle ogni volta:

```powershell
setx ANTHROPIC_API_KEY "sk-ant-la-tua-key"
setx DEEPGRAM_API_KEY "la-tua-key-deepgram"
```

Dopo `setx`:

1. Chiudi PowerShell.
2. Riapri PowerShell.
3. Riavvia il backend.

Verifica:

```powershell
echo $env:ANTHROPIC_API_KEY
echo $env:DEEPGRAM_API_KEY
```

---

## 5. Se JARVIS E Gia Avviato

Se il backend e gia partito senza key, devi riavviarlo. Il backend legge le variabili solo all'avvio.

Per trovare il processo sulla porta 8000:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen
```

Per fermarlo, sostituisci `PID` con il numero in `OwningProcess`:

```powershell
Stop-Process -Id PID
```

Poi riavvia:

```powershell
cd "C:\Applicazioni GAME\jarvis-prime"
$env:ANTHROPIC_API_KEY = "sk-ant-la-tua-key"
$env:DEEPGRAM_API_KEY = "la-tua-key-deepgram"
py -m backend.main
```

---

## 6. Cosa Succede Se Mancano

Senza `ANTHROPIC_API_KEY`:

- Claude Haiku/Sonnet non risponde correttamente.
- Le funzioni AI cloud falliscono o tornano errore.

Senza `DEEPGRAM_API_KEY`:

- La trascrizione vocale Deepgram non funziona.
- Il fallback TTS Deepgram non funziona.

Il TTS locale Piper puo funzionare anche senza Deepgram, se il modello locale e presente in `models`.

