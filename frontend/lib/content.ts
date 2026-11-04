import { Fingerprint, KeyRound, ShieldCheck, Timer, Trash2, UserRoundCheck } from "lucide-react";

/** The security commitments shown on the home page and the Security page. */
export const commitments = [
  { icon: KeyRound, title: "Sessions kept out of reach", text: "The long-lived sign-in token sits in an HttpOnly cookie that page scripts cannot read, and it rotates on every use." },
  { icon: Fingerprint, title: "Passwords are never stored", text: "Only a bcrypt hash is kept, and resetting a password signs out every device." },
  { icon: UserRoundCheck, title: "Your data, only yours", text: "Every search, answer and file lookup is filtered to the signed-in account." },
  { icon: Timer, title: "Guessing is throttled", text: "Sign-in attempts are limited per account and per address, and repeated failures slow to a stop." },
  { icon: ShieldCheck, title: "Originals are not kept", text: "Uploaded files are deleted as soon as their text is extracted and indexed." },
  { icon: Trash2, title: "Delete means delete", text: "Remove one document, or your whole account with every chunk, vector and chat." },
];
