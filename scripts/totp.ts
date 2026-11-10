/** Stampa il codice 2FA corrente per gli account demo (segreto di prova): npm run totp */
import { totp } from "../src/lib/totp";
const SECRET = "JBSWY3DPEHPK3PXP";
const left = 30 - (Math.floor(Date.now() / 1000) % 30);
console.log(`Codice 2FA: ${totp(SECRET)}  (valido ancora ~${left} secondi)`);
