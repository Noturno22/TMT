Continue  opencode -s ses_fd9e38cefffe0tXPn7YdHuiafo

e
Logs for your project will appear below. Press Ctrl+C to exit.
Android Bundled 226548ms node_modules\expo-router\entry.js (2356 modules)
 ERROR  [Error: Uncaught (in promise, id: 0) ReferenceError: Property 'crypto' doesn't exist]

Code: useMovements.ts
  120 |     const record: WalletMovement = {
  121 |       ...movement,
> 122 |       id: crypto.randomUUID(),
      |           ^
  123 |       createdAt: new Date().toISOString(),
  124 |     };
  125 |
Call Stack
  addMovement (src\hooks\useMovements.ts:122:11)
  addMovement (src\hooks\useMovements.ts:119:35)
  confirmDeposit (src\app\depositos.tsx:122:21)
