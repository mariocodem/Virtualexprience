// Conventional Commits con asuntos en español: los tipos siguen la convención,
// el caso del asunto queda libre para nombres propios ("Isla de los Ecos").
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
  },
};
