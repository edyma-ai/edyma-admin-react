/** Generated credentials ('word-word-NN') — readable over the phone, mirrors the backend's bulk-import style. */

const PASSWORD_WORDS = ['amber', 'cedar', 'delta', 'ember', 'flora', 'garnet', 'harbor', 'indigo', 'juniper', 'lotus', 'mango', 'nectar', 'olive', 'pearl', 'quartz', 'saffron']

export function generatePassword(): string {
  const pick = () => PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)]
  const first = pick()
  let second = pick()
  while (second === first) second = pick()
  return `${first}-${second}-${Math.floor(Math.random() * 90) + 10}`
}
